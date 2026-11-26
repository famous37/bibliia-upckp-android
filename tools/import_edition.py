"""Recreate the packaged edition from the author's original Android book."""
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
import re, hashlib, json, sys

# Short contents labels, traditional reference abbreviations and spelling variants.
LABELS = """
0 Буття|Бут
1 Вихід|Вих
2 Левит|Лев
3 Числа|Чис
4 Второзаконня|Втор|Повторення Закону|Повт
6 Ісус Навин|Нав|Іс Нав
7 Судді|Суд
8 Руф|Рут|Руфі
9 1 Царств|1 Цар|1 Самуїла
10 2 Царств|2 Цар|2 Самуїла
11 3 Царств|3 Цар|1 Царів
12 4 Царств|4 Цар|2 Царів
13 1 Паралипоменон|1 Пар|1 Хронік
14 2 Паралипоменон|2 Пар|2 Хронік
15 1 Ездри|1 Езд
16 2 Ездри|2 Езд
17 3 Ездри|3 Езд
18 Неємії|Неєм
19 Товита|Тов
20 Юдифі|Юдф
21 Есфирі|Есф|Естер
22 1 Маккавейська|1 Мак
23 2 Маккавейська|2 Мак
24 3 Маккавейська|3 Мак
26 Іова|Іов|Йов
27 Псалтир|Пс|Псалом|Псалми
28 Притчі Соломонові|Притч|Прип
29 Екклезіаст|Еккл|Проповідник
30 Пісня пісень|Пісн
31 Премудрість Соломона|Прем
32 Премудрість Ісуса, сина Сирахового|Сир|Сирах
34 Ісаї|Іс|Ісая
35 Єремії|Єр
36 Плач Єремії|Плач
37 Послання Єремії|Посл Єр
38 Варуха|Вар
39 Єзекиїля|Єз|Єзекіїля
40 Даниїла|Дан
45 Осії|Ос
46 Іоїля|Іоїл|Йоіл
47 Амоса|Ам
48 Авдія|Авд
49 Іони|Іон|Йона
50 Михея|Мих
51 Наума|Наум
52 Аввакума|Авв
53 Софонії|Соф
54 Аггея|Агг
55 Захарії|Зах
56 Малахії|Мал
61 Від Матфея|Мф|Мт|Матвія|Матфея|Від Матвія
62 Від Марка|Мк|Марка
59 Від Луки|Лк|Луки
60 Від Іоана|Ін|Ів|Івана|Іоана|Від Івана
87 Діяння апостолів|Діян|Дії
65 Якова|Як
66 1 Петра|1 Пет
67 2 Петра|2 Пет
68 1 Іоана|1 Ін|1 Івана|1 Ів
69 2 Іоана|2 Ін|2 Івана|2 Ів
70 3 Іоана|3 Ін|3 Івана|3 Ів
71 Іуди|Іуд|Юди
73 До римлян|Рим
74 1 до коринф’ян|1 Кор
75 2 до коринф’ян|2 Кор
76 До галатів|Гал
77 До ефесян|Еф
78 До филип’ян|Флп|Фил
79 До колосян|Кол
80 1 до солунян|1 Сол
81 2 до солунян|2 Сол
82 1 до Тимофія|1 Тим
83 2 до Тимофія|2 Тим
84 До Тита|Тит
85 До Филимона|Флм
86 До євреїв|Євр
88 Одкровення|Одкр|Апокаліпсис|Об’явлення
"""
NAMES = {int(i):name.split('|') for i,name in (s.split(' ',1) for s in LABELS.strip().splitlines())}
HEAD = re.compile(r'(?:Глава|Псалом)\s+(\d+)(\**)',re.I)
NOTE = re.compile(r'^(?:(?:Глава|Псалом)\s+\d+\.|\*+\s*\S|\[\d+\]\s*(?:\d+\s+)?[А-ЯІЇЄҐA-Z])',re.I)
MARK = re.compile(r'(?<![\d\[])(\d{1,3})(?![\d\].,;:/–-])(?=\s*[«„“"\[(А-Яа-яІіЇїЄєҐґA-Za-z—–])')
SCANS = ['99EE53D6','2EB05D0D','49CBC6B4','1B71AB62','A57BF35D','6A9A4D56']
THREES = {0:{9},9:{3},11:{5,17},12:{16},13:{16,27},14:{12,16,28,33,35},15:{6},
          34:{22},35:{34,44,45},36:{5},39:{14,25,26,28},49:{2},56:{3,4}}
def compact(s):
    return ' '.join(s.split())
def dump(path, data):
    path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
def parse_verses(text, book, chapter):
    # Restore damaged verse numerals only at their verified coordinates.
    if chapter in THREES.get(book,set()):
        match=re.search(r'(?<!\d)2(?=\s|[А-ЯІЇЄҐ])(.+?)(?<!\d)4(?=\s|[А-ЯІЇЄҐ])',text,re.S)
        if match:
            fixed=re.sub(r'(?<!\w)З(?=\s+|ми зробилися)','3',match[1],count=1)
            text=text[:match.start(1)]+fixed+text[match.end(1):]
    if (book,chapter)==(10,23): text=re.sub(r'3\s+8(?=\s+Іра)','38',text)
    if (book,chapter)==(73,11): text=re.sub(r'(?<!\d)0(?=\s+нехай потьмаряться)','10',text)
    if (book,chapter)==(88,7): text=re.sub(r'5\s+3(?=\s+коліна)','5 З',text)
    if (book,chapter)==(40,3): text=re.sub(r'\[24\s*\*','24 [*',text)
    current=0
    marks=[]
    candidates=list(MARK.finditer(text))
    for i,m in enumerate(candidates):
        n=int(m[1])
        following=[int(v[1]) for v in candidates[i+1:i+4]]
        if n==current+1 or (current==0 and n==2) or (current<n<=current+8 and n+1 in following):
            marks.append(m)
            current=n
    before=text[:marks[0].start()] if marks else text
    rows=[]
    if before.strip(): rows.append([0 if marks and int(marks[0][1])==1 else 1,compact(before)])
    for i,m in enumerate(marks):
        end=marks[i+1].start() if i+1<len(marks) else len(text)
        rows.append([int(m[1]),compact(text[m.end():end])])
    return rows
def book_chapters(text,book,article):
    sections=[]
    preface=[]
    body=[]
    number=None
    suffix=''
    for l in (l.strip() for l in text.splitlines() if l.strip()):
        head=HEAD.fullmatch(l)
        if head and not article:
            if number is None: preface=body
            else: sections.append((number,suffix,body))
            number,suffix,body=int(head[1]),head[2],[]
        else: body.append(l)
    if number is None and book==37: preface,body=body[:1],body[1:]
    sections.append((number or 1,suffix,body))
    result=[]
    for n,suffix,lines in sections:
        rows=[[0,compact(v)] for v in preface] if n==1 else []
        body=[]
        refs=False
        for line in lines:
            if article: rows.append([0,compact(line)]);continue
            if refs or NOTE.match(line):
                if body: rows.extend(parse_verses('\n'.join(body),book,n));body=[]
                k=0 if (book,n)==(32,50) and line.startswith('Молитва Ісуса') else -1
                rows.append([k,compact(line)])
                refs = refs or bool(re.match(r'^(Глава|Псалом)\s+\d+\.',line))
            else: body.append(line)
        if body: rows.extend(parse_verses('\n'.join(body),book,n))
        result.append({'n':n,'mark':suffix,'rows':rows})
    return result
def convert(source,root):
    data=root/'data';scans=root/'scans'
    for d in (data,scans): d.mkdir(exist_ok=True,parents=True)
    catalog=[]
    with ZipFile(source) as apk:
        tree=ET.fromstring(apk.read('assets/chapters.xml'))
        def walk(parent,section,group):
            for node in tree:
                a=node.attrib
                if a['parent']!=str(parent):continue
                k=int(a['id']);name=a['title'].strip()
                if not a['content']:walk(k,section,name);continue
                text=apk.read('assets/'+a['content']).decode('utf-8-sig')
                ch=book_chapters(text,k,section=='app');dump(data/f'{k}.json',ch)
                title,*aliases=NAMES.get(k,[name.replace('i','і')])
                catalog.append(dict(id=k,title=title,aliases=aliases,original=name,group=group,section=section,count=len(ch)))
        for k,section in [(42,'old'),(43,'new'),(91,'app')]:walk(k,section,'')
        assert {n.get('content') for n in tree if n.get('content')}=={n[7:] for n in apk.namelist() if n.startswith('assets/') and n.endswith('.txt') and apk.read(n).decode('utf-8-sig').strip()}
        images={n:apk.read(n) for n in apk.namelist() if n.startswith('assets/') and n.endswith('.png')}
        for i,pre in enumerate(SCANS,1057):
            (scans/f'{i}.png').write_bytes(next(v for n,v in images.items() if n.startswith('assets/'+pre)))
        assert {hashlib.sha256(b).digest() for b in images.values()}=={hashlib.sha256(p.read_bytes()).digest() for p in scans.glob('*.png')}
    dump(data/'catalog.json',catalog)
if __name__=='__main__':
    convert(Path(sys.argv[1]),Path(sys.argv[2]))
