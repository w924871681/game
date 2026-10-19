"""Original layered Day 5B art, deterministic SVG/Pillow, no network or fonts.

The six supplied design posters guide broad palette and device recognition only.
No poster pixels are cropped, sampled or used as a runtime screen. Existing
Day5A/V2/V2.1/V2.2 art, manifests and Creator serialization are never written.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
from pathlib import Path
import sys
from xml.sax.saxutils import escape

from PIL import Image

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools/art"))
from generate_day5a import Canvas

SOURCE = ROOT / "tools/art/day5b/sources"
ART = ROOT / "assets/art/day5b"
INK = "#365B58"
CREAM = "#FFF1D6"
EDGE = "#BAA487"
MINT = "#83BDA4"
TEAL = "#3E8077"
DARK = "#294D50"
GOLD = "#E7B757"
SHADOW = (73, 65, 48, 38)


def curve(start, a, b, end, count=18):
    return [tuple((1-t)**3*start[k] + 3*(1-t)**2*t*a[k]
                  + 3*(1-t)*t*t*b[k] + t**3*end[k] for k in (0, 1))
            for t in [i/count for i in range(count+1)]]


def controller():
    c = Canvas(840, 500)
    c.ellipse(78, 400, 680, 58, SHADOW)
    body = curve((175, 88), (232, 63), (606, 63), (665, 88))
    body += curve((665, 88), (725, 112), (805, 375), (742, 436))
    body += curve((742, 436), (695, 478), (620, 322), (568, 315))
    body += curve((568, 315), (485, 298), (355, 298), (272, 315))
    body += curve((272, 315), (220, 322), (145, 478), (98, 436))
    body += curve((98, 436), (35, 375), (115, 112), (175, 88))
    c.poly(body, "#C7B79C", INK, 7)
    c.poly([(x, y-11) for x,y in body], CREAM, INK, 6)
    c.line(curve((183, 98), (310, 67), (543, 67), (657, 98)), "#FFFCED", 10)
    c.poly(curve((120, 276), (96, 320), (64, 388), (105, 423))
           + curve((105, 423), (137, 452), (196, 346), (225, 318)), MINT)
    c.poly(curve((720, 276), (744, 320), (776, 388), (735, 423))
           + curve((735, 423), (703, 452), (644, 346), (615, 318)), MINT)
    for x,y in [(230,174),(581,278)]:
        c.ellipse(x-64,y-64,128,128,"#AFB4A0",INK,5)
        c.ellipse(x-52,y-53,104,104,DARK,INK,4)
        c.ellipse(x-42,y-46,84,79,"#5D7470",INK,3)
        c.arc(x,y-4,32,30,195,332,"#8FA39A",5)
    c.rect(289,244,40,102,DARK,11,INK,3)
    c.rect(259,275,101,40,DARK,11,INK,3)
    c.line([(277,282),(317,282),(317,258)],"#647E75",4)
    for x,y,color in [(642,140,GOLD),(694,194,"#DD8273"),(590,194,"#75AECD"),(642,245,MINT)]:
        c.ellipse(x-24,y-24,48,48,"#4D6462",INK,3)
        c.ellipse(x-16,y-20,32,30,color)
        c.arc(x,y-5,13,11,198,292,"#F5E9CB",2)
    c.rect(363,132,114,70,"#D2D9BD",15,EDGE,3)
    c.line([(390,168),(450,168)],TEAL,4)
    c.line([(420,145),(420,189)],TEAL,4)
    for x in [374,408,442,476]:
        c.ellipse(x,251,14,9,"#C5BCA4",INK,1.5)
    c.rect(397,294,47,17,TEAL,6,INK,2)
    return c


def printer():
    c = Canvas(840,500)
    c.ellipse(55,428,730,49,SHADOW)
    c.rect(146,47,548,212,"#D3C6AA",25,INK,5)
    c.rect(167,35,505,139,CREAM,18,EDGE,4)
    c.rect(190,64,460,74,DARK,10,INK,4)
    c.rect(207,76,426,50,"#789187",7)
    for x in range(231,617,35):c.line([(x,81),(x,119)],"#A4B4A1",3)
    c.poly([(111,143),(727,143),(783,222),(57,222)],"#FFFAE9",INK,5)
    c.rect(57,207,726,225,"#CEBE9F",37,INK,6)
    c.rect(67,202,707,184,CREAM,32,INK,4)
    c.line([(94,222),(741,222)],"#FFFEF4",8)
    c.rect(169,298,500,108,DARK,15,INK,5)
    c.rect(190,315,460,75,"#718379",9)
    c.rect(159,394,522,47,"#CBB895",10,INK,4)
    c.rect(176,394,487,23,"#FFF6DB",7)
    for x in [202,613]:
        c.rect(x,311,23,74,"#D7D3B9",8,INK,2)
    c.ellipse(684,242,46,46,DARK,INK,3)
    c.arc(707,264,13,13,-70,250,MINT,5)
    c.line([(707,247),(707,261)],MINT,5)
    c.ellipse(698,302,17,17,GOLD,INK,2)
    c.rect(341,238,157,29,"#E0D9BB",8)
    c.line([(374,252),(466,252)],"#A3AF96",4)
    return c


def keyboard():
    c=Canvas(840,500)
    c.ellipse(39,395,766,65,SHADOW)
    c.rect(32,115,775,309,"#B9A98C",29,INK,6)
    c.rect(30,99,775,305,CREAM,29,INK,6)
    c.rect(45,116,745,267,"#8FAA96",18,INK,3)
    for row in range(4):
        for col in range(13):
            x,y=59+col*55,134+row*56
            fill=MINT if row==0 or col==0 or col==12 else "#FFF9E6"
            c.rect(x,y+5,46,46,"#A4967C",7,INK,1.5)
            c.rect(x,y,46,43,fill,7,INK,2)
            c.line([(x+7,y+8),(x+37,y+8)],"#EDF2D8",3)
    c.rect(233,319,321,46,"#BBA988",7,INK,2)
    c.rect(233,314,321,44,"#FFFAE8",7,INK,2)
    for x in [686,710,734]:c.ellipse(x,80,11,7,MINT,INK,1)
    c.line([(63,392),(767,392)],"#FFF9EA",5)
    return c


def fan():
    c=Canvas(840,500)
    c.ellipse(164,424,515,41,SHADOW)
    c.rect(190,31,460,424,"#395E5A",31,INK,7)
    c.rect(185,22,460,414,"#728B7C",31,INK,6)
    c.rect(199,34,430,387,"#A6AD92",26)
    c.ellipse(220,46,387,365,DARK,INK,6)
    c.ellipse(239,64,350,332,"#456F66",INK,3)
    for a in range(0,360,51):
        angle=math.radians(a)
        pts=curve((420,228),(475,172),(562,135),(569,213))
        pts+=curve((569,213),(575,287),(478,298),(420,247))
        c.poly([(420+(x-420)*math.cos(angle)-(y-238)*math.sin(angle),238+(x-420)*math.sin(angle)+(y-238)*math.cos(angle)) for x,y in pts],MINT,INK,3)
    c.ellipse(354,175,130,125,"#AEBA9D",INK,5)
    c.ellipse(368,187,101,95,"#E8D9B6",INK,3)
    c.ellipse(393,211,49,45,"#F8ECD0",EDGE,2)
    for x,y in [(218,51),(584,51),(218,369),(584,369)]:
        c.ellipse(x,y,30,30,"#45655B",INK,3)
        c.ellipse(x+9,y+9,12,12,"#B6C1A4")
    for i,color in enumerate(["#D0816C",GOLD,DARK]):c.line([(643,328+i*11),(695,373+i*11),(751,373+i*11)],color,7)
    c.rect(740,368,48,46,CREAM,7,INK,3)
    return c


def headset():
    c=Canvas(840,500)
    c.ellipse(116,417,612,43,SHADOW)
    c.arc(420,267,245,217,184,356,INK,46)
    c.arc(420,252,240,209,184,356,CREAM,31)
    c.arc(420,238,194,157,207,333,MINT,33)
    c.arc(420,230,194,157,220,320,"#B7D5B6",7)
    for x,side in [(172,-1),(578,1)]:
        c.rect(x+16,205,61,153,"#D9CBAE",22,INK,4)
        c.rect(x,232,99,181,TEAL,35,INK,5)
        c.rect(x+12,240,82,151,MINT,29)
        c.rect(x-10 if side<0 else x+31,252,69,139,CREAM,27,INK,4)
        c.ellipse(x+6 if side<0 else x+47,287,37,57,"#DDE1C7",INK,2)
    c.line([(221,397),(223,439),(286,459),(348,452)],INK,7)
    return c


def livestream():
    c=Canvas(840,500)
    c.ellipse(80,424,683,44,SHADOW)
    c.rect(215,368,349,66,DARK,13,INK,4)
    c.rect(357,293,83,120,"#6A8479",13,INK,4)
    c.rect(139,29,577,330,"#6A7E73",24,INK,6)
    c.rect(131,23,577,323,DARK,24,INK,6)
    c.rect(151,43,536,280,"#A8CBB2",12,INK,3)
    # Blank scene with camera viewfinder; live UI/status values remain runtime labels.
    c.rect(170,61,370,242,"#D3E2BD",7)
    c.rect(191,206,327,83,"#7DAF97",7)
    c.ellipse(292,96,89,87,"#FFE9BD",INK,3)
    c.poly(curve((294,138),(280,65),(390,65),(382,139))+[(365,112),(338,124),(310,113)],"#775F43",INK,2)
    c.rect(274,183,128,99,TEAL,34,INK,2)
    c.rect(556,62,109,240,"#6B9B8D",7)
    for y in [82,126,170,214,258]:
        c.ellipse(567,y,19,19,"#DCE9CA")
        c.line([(596,y+8),(648,y+8)],"#B0CDB1",4)
    for x,y,dx,dy in [(180,76,28,28),(521,76,-28,28),(180,280,28,-28),(521,280,-28,-28)]:
        c.line([(x,y+dy),(x,y),(x+dx,y)],"#FCF2D3",4)
    c.rect(38,217,68,167,TEAL,31,INK,4)
    c.ellipse(31,148,82,122,"#445F5C",INK,4)
    for x in range(44,107,12):c.line([(x,167),(x,240)],"#8FA897",3)
    c.arc(73,286,55,73,0,180,INK,8)
    c.line([(73,357),(73,417)],INK,9)
    c.rect(27,411,97,19,"#809A85",8,INK,3)
    c.rect(733,247,76,151,"#8BAB95",10,INK,4)
    for x in [747,768,789]:
        c.line([(x,268),(x,370)],INK,4)
        c.rect(x-6,294+(x%3)*23,13,25,CREAM,4,INK,2)
    return c


def joystick():
    c=Canvas(240,240)
    c.ellipse(15,29,210,197,SHADOW)
    c.ellipse(11,12,218,214,"#BBC3A7",INK,6)
    c.ellipse(27,23,187,184,DARK,INK,5)
    c.ellipse(43,33,156,148,"#637B70",INK,4)
    c.arc(120,104,59,51,193,332,"#9DAF98",6)
    return c


def paper(crumpled):
    c=Canvas(240,300)
    edge=[(34,14),(203,14),(221,269),(195,281),(176,270),(149,286),(120,275),(93,285),(67,273),(39,283),(20,270)]
    c.poly([(x+4,y+5) for x,y in edge],SHADOW)
    c.poly(edge,CREAM,INK,3)
    if crumpled:
        for i in range(5):
            y=36+i*47
            c.poly([(35,y),(103,y+24),(199,y-10),(143,y+41)],"#E3D5B8")
            c.line([(34,y),(105,y+22),(198,y-9)],"#B8AB91",2)
            c.line([(105,y+22),(145,y+39),(205,y+28)],"#FFFCEC",3)
    else:
        c.ellipse(70,83,101,100,"#C6DDB5",INK,3)
        c.ellipse(95,113,8,11,INK);c.ellipse(141,113,8,11,INK)
        c.arc(122,131,29,25,15,166,INK,4)
        for y in [213,232,251]:c.line([(61,y),(182,y)],"#BDCCAB",4)
    return c


def keycap():
    c=Canvas(160,160)
    c.rect(14,24,132,126,"#B6A485",22,INK,5)
    c.rect(12,10,132,126,CREAM,22,INK,5)
    c.line([(34,28),(123,28)],"#FFFFFF",7)
    c.line([(31,120),(126,120)],"#D6C5A3",4)
    return c


def screw():
    c=Canvas(180,180)
    c.ellipse(22,33,136,136,SHADOW)
    c.ellipse(18,20,144,144,"#8A9B8D",INK,5)
    c.ellipse(22,12,136,136,"#D6DEBF",INK,5)
    c.ellipse(37,27,106,105,"#EDF0D5",EDGE,3)
    c.line([(60,56),(120,112)],"#4E7067",13)
    c.line([(120,56),(60,112)],"#4E7067",13)
    c.arc(90,79,54,51,205,300,"#FFFFFF",5)
    return c


def fan_blades():
    c=Canvas(400,400)
    for i in range(7):
        a=math.radians(i*360/7)
        pts=curve((200,185),(245,92),(346,84),(352,163))
        pts+=curve((352,163),(350,246),(248,255),(200,215))
        c.poly([(200+(x-200)*math.cos(a)-(y-200)*math.sin(a),200+(x-200)*math.sin(a)+(y-200)*math.cos(a)) for x,y in pts],MINT,INK,4)
    c.ellipse(148,148,104,104,CREAM,INK,5)
    c.ellipse(173,173,54,54,"#D5C7A5",EDGE,2)
    return c


def fan_cover():
    c=Canvas(400,400)
    for r in [63,101,139,177]:c.arc(200,200,r,r,0,360,"#395B54",10)
    for a in range(0,360,45):
        r=math.radians(a);c.line([(200+40*math.cos(r),200+40*math.sin(r)),(200+182*math.cos(r),200+182*math.sin(r))],"#395B54",11)
    c.ellipse(163,163,74,74,"#829C83",INK,4)
    return c


def trace_handle():
    c=Canvas(160,160)
    c.ellipse(10,21,139,129,SHADOW)
    c.ellipse(8,8,143,139,CREAM,INK,5)
    c.ellipse(24,23,110,108,MINT,INK,4)
    c.poly([(60,47),(103,78),(60,110)],"#F9F4D8",INK,3)
    return c


def slider_thumb():
    c=Canvas(160,160)
    c.rect(20,25,120,120,SHADOW,30)
    c.rect(14,12,128,128,"#5D9980",30,INK,5)
    c.rect(25,20,106,107,CREAM,25,INK,3)
    for x in [67,87]:c.line([(x,49),(x,98)],TEAL,8)
    return c


DRAWINGS=[('devices/controller',controller),('devices/printer',printer),
          ('devices/keyboard',keyboard),('devices/fan',fan),
          ('devices/headset',headset),('devices/livestream',livestream),
          ('layers/joystick',joystick),('layers/paper-crumpled',lambda:paper(True)),
          ('layers/paper-test',lambda:paper(False)),('layers/keycap',keycap),
          ('layers/screw',screw),('layers/fan-blades',fan_blades),
          ('layers/fan-cover',fan_cover),('layers/trace-handle',trace_handle),
          ('layers/slider-thumb',slider_thumb)]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify',action='store_true',help='Compute deterministically and compare; write nothing.')
    options=parser.parse_args();records=[];issues=[]
    for key,draw in DRAWINGS:
        c=draw();source=SOURCE/(key+'.svg');asset=ART/(key+'.png')
        title=escape('DeskRescue Day 5B original '+key)
        svg=(f'<svg xmlns="http://www.w3.org/2000/svg" width="{c.width}" height="{c.height}" viewBox="0 0 {c.width} {c.height}">\n<title>{title}</title>\n'+'\n'.join(c.svg)+'\n</svg>\n').encode('utf8')
        png=io.BytesIO();c.image.resize((c.width,c.height),Image.Resampling.LANCZOS).save(png,format='PNG',optimize=True)
        for path,data in [(source,svg),(asset,png.getvalue())]:
            if options.verify:
                if not path.exists() or path.read_bytes()!=data:issues.append(path.relative_to(ROOT).as_posix())
            else:
                path.parent.mkdir(parents=True,exist_ok=True)
                if not path.exists() or path.read_bytes()!=data:path.write_bytes(data)
        records.append({'key':'day5b/'+key,'path':asset.relative_to(ROOT).as_posix(),'source':source.relative_to(ROOT).as_posix(),
                        'width':c.width,'height':c.height,'bytes':len(png.getvalue()),'sha256':sha(png.getvalue()),'sourceSha256':sha(svg),
                        'origin':'Original DeskRescue Day5B geometry; no downloaded images/fonts/audio, no reference poster pixels.',
                        'method':'Shared vector primitives -> editable SVG plus 3x Pillow antialiased transparent PNG'})
    manifest={'schemaVersion':1,'phase':'day5b','generator':'tools/art/day5b/generate_day5b.py',
              'licensing':'Original project geometry; repository license unchanged. References guide broad palette/composition only.',
              'reproduction':'python tools/art/day5b/generate_day5b.py; --verify performs deterministic byte comparisons without writes.',
              'runtimeAssetCount':len(records),'runtimeBytes':sum(x['bytes'] for x in records),'runtimeAssets':records}
    dest=SOURCE.parent/'asset-sources.json';data=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode('utf8')
    if options.verify:
        if not dest.exists() or dest.read_bytes()!=data:issues.append(dest.relative_to(ROOT).as_posix())
    elif not dest.exists() or dest.read_bytes()!=data:dest.write_bytes(data)
    print(json.dumps({'ok':not issues,'verifyOnly':options.verify,'assetCount':len(records),'runtimeBytes':manifest['runtimeBytes'],'issues':issues}))
    if issues:raise SystemExit(1)


if __name__=='__main__':main()
