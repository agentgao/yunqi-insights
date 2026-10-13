#!/usr/bin/env python3
"""Portable, offline access to the bundled Yunqi transcript corpus."""
import argparse
import hashlib
import json
import sys
import unicodedata
from pathlib import Path, PurePosixPath
from urllib.parse import parse_qs, urlsplit

DEFAULT_ROOT = Path(__file__).resolve().parents[1]


def normalize(text):
    return unicodedata.normalize('NFKC', str(text)).casefold()


class CorpusError(ValueError):
    pass


class Corpus:
    def __init__(self, root=DEFAULT_ROOT):
        self.root = Path(root).resolve()

    def path(self, name):
        if not isinstance(name, str) or not name or '\\' in name:
            raise CorpusError('数据路径无效。')
        rel = PurePosixPath(name)
        if rel.is_absolute() or '..' in rel.parts or ':' in name:
            raise CorpusError('数据路径不得为绝对路径或越出 skill 目录。')
        current = self.root
        for part in rel.parts:
            current = current / part
            if current.is_symlink():
                raise CorpusError('skill 内部数据不得使用符号链接。')
        if not current.is_relative_to(self.root):
            raise CorpusError('数据路径越界。')
        return current

    def load(self, name):
        try:
            doc = json.loads(self.path(name).read_text(encoding='utf-8'))
            check_metadata(doc)
            return doc
        except (OSError, UnicodeError, json.JSONDecodeError):
            raise CorpusError('无法读取内嵌数据：' + name) from None

    def catalog(self):
        doc = self.load('data/catalog.json')
        check_metadata(doc)
        return doc['sessions']

    def session(self, sid):
        entries = [s for s in self.catalog() if str(s['id']) == str(sid)]
        if not entries:
            missing = [s for s in self.load('data/coverage.json').get('missing_sessions', []) if str(s['id']) == str(sid)]
            detail = missing[0].get('reason', '没有内嵌全文') if missing else '未收录此场次'
            raise CorpusError('场次 ' + str(sid) + '：' + detail + '。仅使用内嵌语料，不从外部读取。')
        doc = self.load(entries[0]['text_file'])
        check_metadata(doc)
        return doc

    @staticmethod
    def topic(segments, query, allow_missing=False):
        if query is None:
            return segments
        exact = [s for s in segments if s['id'] == query or s['title'] == query]
        selected = exact or [s for s in segments if normalize(query) in normalize(s['title'])]
        if not selected and allow_missing:
            return []
        if len(selected) != 1:
            raise CorpusError('主题未找到或标题不唯一；请使用精确主题 ID 或标题。')
        return selected

    def paragraphs(self, sid, topic=None, allow_missing_topic=False):
        doc = self.session(sid)
        sess = doc['session']
        for seg in self.topic(doc['segments'], topic, allow_missing_topic):
            for block in seg['blocks']:
                for para in block['paragraphs']:
                    yield dict(para, session_id=sess['id'], session_title=sess['title'],
                               official_url=sess['official_url'], topic_id=seg['id'],
                               topic_title=seg['title'], segment_kind=seg['kind'], block_id=block['id'])

    def verify(self):
        manifest = self.load('data/manifest.json')
        if manifest.get('schema_version') != 1:
            raise CorpusError('manifest schema_version 无效。')
        expected = set()
        for entry in manifest['files']:
            name = entry['path']
            if not name.startswith('data/') or name == 'data/manifest.json' or name in expected:
                raise CorpusError('manifest 文件清单无效或重复。')
            expected.add(name)
            try:
                raw = self.path(name).read_bytes()
            except OSError:
                raise CorpusError('manifest 文件缺失：' + name) from None
            if len(raw) != entry['byte_size'] or hashlib.sha256(raw).hexdigest() != entry['sha256']:
                raise CorpusError('数据校验失败（大小或 SHA256）：' + name)
        data = self.path('data')
        for item in self.root.rglob('*'):
            if item.is_symlink():
                raise CorpusError('skill 内部文件不得使用符号链接。')
        actual = set()
        for item in data.rglob('*'):
            if item.is_symlink():
                raise CorpusError('skill 内部数据不得使用符号链接。')
            if item.is_file():
                actual.add(item.relative_to(self.root).as_posix())
        if actual != expected | {'data/manifest.json'}:
            raise CorpusError('manifest 未完整覆盖 data 文件。')
        coverage = self.load('data/coverage.json')
        if manifest['counts'] != coverage['counts']:
            raise CorpusError('manifest 与 coverage 计数不一致。')
        sessions = self.catalog()
        files = {'data/catalog.json', 'data/coverage.json'}
        ids = set()
        counts = dict(sessions=len(sessions), topics=0, supplements=0, blocks=0, paragraphs=0, cues=0,
                      missing_sessions=len(coverage.get('missing_sessions', [])))
        missing_ids = set()
        for missing in coverage.get('missing_sessions', []):
            mid = str(missing['id'])
            if mid in missing_ids:
                raise CorpusError('缺失场次 ID 重复。')
            missing_ids.add(mid)
            check_session_url(missing['official_url'], mid)
        for s in sessions:
            if str(s['id']) in ids or str(s['id']) in missing_ids:
                raise CorpusError('场次 ID 重复。')
            ids.add(str(s['id']))
            check_session_url(s['official_url'], s['id'])
            files.add(s['text_file'])
            doc = self.session(s['id'])
            check_metadata(doc)
            if doc.get('schema_version') != 1 or any(doc['session'][k] != s[k] for k in ('id', 'title', 'year', 'official_url')):
                raise CorpusError('场次元数据与目录不一致。')
            subtotal = dict(topics=0, supplements=0, blocks=0, paragraphs=0, cues=0)
            pids, cues, segids = set(), set(), set()
            catalog_topics = {t['id']: t for t in s['topics']}
            if len(catalog_topics) != len(s['topics']):
                raise CorpusError('目录主题 ID 重复。')
            actual_topics = set()
            for seg in doc['segments']:
                if seg['id'] in segids or seg['kind'] not in ('topic', 'supplement', 'opening', 'transition', 'closing', 'break'):
                    raise CorpusError('主题 ID 或种类无效。')
                segids.add(seg['id'])
                subtotal['topics' if seg['kind'] == 'topic' else 'supplements'] += 1
                if seg['kind'] == 'topic':
                    actual_topics.add(seg['id'])
                    t = catalog_topics.get(seg['id'])
                    seg_counts = dict(block_count=len(seg['blocks']),
                                      paragraph_count=sum(len(b['paragraphs']) for b in seg['blocks']),
                                      cue_count=sum(len(p['cue_ids']) for b in seg['blocks'] for p in b['paragraphs']))
                    if t is None or any(t.get(k) != v for k, v in seg_counts.items()) or any(t.get(k) != seg.get(k) for k in ('title', 'kind', 'start_ms', 'end_ms')):
                        raise CorpusError('目录主题元数据或计数不一致。')
                for block in seg['blocks']:
                    subtotal['blocks'] += 1
                    for p in block['paragraphs']:
                        if p['id'] in pids or not isinstance(p['text'], str) or not p['text'].strip():
                            raise CorpusError('段落 ID 重复或正文为空。')
                        pids.add(p['id'])
                        subtotal['paragraphs'] += 1
                        for cue in p['cue_ids']:
                            if cue in cues:
                                raise CorpusError('同一场次的 cue ID 重复。')
                            cues.add(cue)
                            subtotal['cues'] += 1
            if actual_topics != set(catalog_topics):
                raise CorpusError('目录主题覆盖不一致。')
            if subtotal != doc['counts']:
                raise CorpusError('场次计数不一致。')
            if s['topics_count'] != subtotal['topics'] or s['paragraph_count'] != subtotal['paragraphs'] or s['cue_count'] != subtotal['cues']:
                raise CorpusError('目录计数不一致。')
            for key, value in subtotal.items():
                counts[key] += value
        if files != expected or any(coverage['counts'].get(k) != v for k, v in counts.items()):
            raise CorpusError('语料文件覆盖或汇总计数不一致。')
        return {'ok': True, 'files_verified': len(expected), 'counts': counts}


def check_url(value):
    parsed = urlsplit(value)
    if parsed.scheme != 'https' or parsed.hostname != 'yunqi.aliyun.com' or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise CorpusError('视频链接必须是 https://yunqi.aliyun.com 官网链接。')


def check_session_url(value, sid):
    check_url(value)
    if parse_qs(urlsplit(value).query).get('agendaId') != [str(sid)]:
        raise CorpusError('官网链接 agendaId 与场次 ID 不一致。')


def check_metadata(value, key=''):
    if isinstance(value, dict):
        for k, v in value.items():
            check_metadata(v, k)
    elif isinstance(value, list):
        for v in value:
            check_metadata(v, key)
    elif isinstance(value, str) and key not in ('text', 'summary', 'title', 'slide_title', 'key_points', 'speaker', 'speakers'):
        if 'url' in key:
            check_url(value)
        elif value.startswith(('/', '~/', 'file:', '\\')) or '..' in PurePosixPath(value).parts or (len(value) > 1 and value[1] == ':'):
            raise CorpusError('元数据不得包含外部文件路径。')


def page(items, offset, limit):
    if offset < 0 or limit < 1 or limit > 100:
        raise CorpusError('offset 必须非负，limit 必须在 1–100 之间。')
    total = len(items)
    result = items[offset:offset + limit]
    more = offset + len(result) < total
    return {'total': total, 'offset': offset, 'limit': limit, 'has_more': more,
            'next_offset': offset + len(result) if more else None, 'results': result}


class JSONArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        raise CorpusError('参数错误：' + message)


def main(argv=None, root=DEFAULT_ROOT):
    parser = JSONArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('stats')
    sub.add_parser('verify')
    ls = sub.add_parser('list'); ls.add_argument('--query', default='')
    topics = sub.add_parser('topics'); topics.add_argument('--session'); topics.add_argument('--query', default='')
    search = sub.add_parser('search'); search.add_argument('query', nargs='+'); search.add_argument('--match', choices=('any', 'all', 'phrase'), default='all'); search.add_argument('--session', action='append'); search.add_argument('--topic')
    read = sub.add_parser('read'); read.add_argument('--session', required=True); read.add_argument('--topic'); read.add_argument('--paragraph', action='append'); read.add_argument('--start-ms', type=int); read.add_argument('--end-ms', type=int)
    for cmd in (ls, topics, search, read):
        cmd.add_argument('--offset', type=int, default=0); cmd.add_argument('--limit', type=int, default=20)
    try:
        a = parser.parse_args(argv)
        c = Corpus(root)
        if a.command == 'verify':
            result = c.verify()
        elif a.command == 'stats':
            result = c.load('data/coverage.json')
        elif a.command == 'list':
            fields = ('id', 'year', 'title', 'official_url', 'summary', 'topics_count', 'paragraph_count', 'cue_count', 'text_file')
            items = []
            for s in c.catalog():
                haystack = ' '.join([str(s['id']), s['title'], s.get('summary', '')] + [str(t.get('speakers', '')) for t in s['topics']])
                if normalize(a.query) in normalize(haystack):
                    items.append({k: s[k] for k in fields})
            result = page(items, a.offset, a.limit)
            result['metadata_notice'] = 'summary 是编辑元数据，不是演讲原话。'
        elif a.command == 'topics':
            items = []
            for s in c.catalog():
                if a.session and str(s['id']) != a.session:
                    continue
                for t in s['topics']:
                    if normalize(a.query) in normalize(t['title'] + ' ' + t.get('summary', '') + ' ' + str(t.get('speakers', ''))):
                        items.append(dict(t, session_id=s['id'], session_title=s['title'], official_url=s['official_url']))
            if a.session:
                c.session(a.session)
            result = page(items, a.offset, a.limit)
            result['metadata_notice'] = 'summary 和 key_points 是编辑元数据，不是演讲原话。'
        elif a.command == 'read':
            if a.start_ms is not None and a.end_ms is not None and a.start_ms > a.end_ms:
                raise CorpusError('start-ms 不得大于 end-ms。')
            items = list(c.paragraphs(a.session, a.topic))
            if a.paragraph:
                unknown = set(a.paragraph) - {p['id'] for p in items}
                if unknown:
                    raise CorpusError('段落 ID 未找到：' + ', '.join(sorted(unknown)))
                items = [p for p in items if p['id'] in a.paragraph]
            items = [p for p in items if (a.start_ms is None or p['end_ms'] >= a.start_ms) and (a.end_ms is None or p['start_ms'] <= a.end_ms)]
            result = page(items, a.offset, a.limit)
        else:
            terms = [normalize(q) for q in a.query]
            if not all(terms):
                raise CorpusError('搜索词不得为空。')
            items = []
            for sid in a.session or [s['id'] for s in c.catalog()]:
                for p in c.paragraphs(sid, a.topic, allow_missing_topic=not a.session or len(a.session) > 1):
                    folded = normalize(p['text'])
                    matches = [term in folded for term in terms]
                    if (a.match == 'any' and any(matches)) or (a.match == 'all' and all(matches)) or (a.match == 'phrase' and ' '.join(terms) in folded):
                        # Keep snippets bounded even when casefold expands characters.
                        pos = min((folded.index(t) for t in terms if t in folded), default=0)
                        begin = max(0, min(pos, len(p['text'])) - 120)
                        body = p.pop('text')
                        p['paragraph_id'] = p['id']
                        p['snippet'] = body[begin:begin + 400]
                        p['snippet_truncated'] = begin > 0 or begin + 400 < len(body)
                        items.append(p)
            result = page(items, a.offset, a.limit)
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except (CorpusError, KeyError, TypeError, ValueError) as exc:
        message = str(exc) if isinstance(exc, CorpusError) else '内嵌语料格式或参数无效。'
        print(json.dumps({'error': message}, ensure_ascii=False))
        return 2


if __name__ == '__main__':
    sys.exit(main())
