import re
from glob import glob
from acdh_tei_pyutils.tei import TeiReader


def is_roman(string):
    return bool(re.match("^[IVMX.]+$", string.strip()))


xml_dir = "../data/source/"
for fp in glob(f"{xml_dir}*.xml"):
    if not "section" in fp:
        doc = TeiReader(fp)
        title_ps = doc.any_xpath(".//tei:body//tei:p[tei:title]")
        counter = 0
        sections = []
        for tp in title_ps:
            text = tp.xpath(".//tei:title//text()[1]", namespaces=doc.ns_tei)[0]
            if is_roman(text):
                counter += 1
                print(text)
                tp.tag = tp.tag.strip("p") + "div"
                tp.attrib["type"] = "section"
                tp.attrib["section_id"] = f"id_{counter}"
                sections.append(tp)
        sections.reverse()
        for section in sections:
            for s in section.xpath("./following-sibling::*"):
                if not s.xpath("local-name() = 'div' and @type = 'section'"):
                    section.append(s)
                else:
                    break
        new_fp = fp.removesuffix(".xml")+"_sections.xml"
        print(new_fp)
        doc.tree_to_file(new_fp)