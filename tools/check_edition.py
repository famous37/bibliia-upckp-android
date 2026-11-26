from collections import Counter
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]/'app/src/main/assets/reader'
data=root/'data'
books=json.loads((data/'catalog.json').read_text())
assert Counter(b['section'] for b in books)=={'old':50,'new':27,'app':4}
assert len(books)==len({b['id'] for b in books})==81
verses={}
for b in books:
    chapters=json.loads((data/f"{b['id']}.json").read_text())
    assert b['count']==len(chapters)
    for num,ch in enumerate(chapters,1):
        assert num==ch['n'] and ch['rows'] and all(t for _,t in ch['rows'])
        if b['section']=='app':continue
        keys=[n for n,_ in ch['rows'] if n>0]
        assert keys==list(range(1,max(keys)+1)),(b['id'],num,keys)
        verses[b['id'],num]=dict((n,t) for n,t in ch['rows'] if n>0)
assert len(verses)==1361 and len(verses[0,1])==31
assert len(verses[27,118])==176 and len(verses[27,151])==7
assert 'полюбив Бог світ' in verses[60,3][16] and 'Сусанна' in verses[40,13][2]
assert {p.stem for p in (root/'scans').glob('*.png')}==set(map(str,range(1057,1063)))
print('77 books, 1,361 consecutive chapters, all chapter verse sequences, 4 articles, 6 unique scans verified')
