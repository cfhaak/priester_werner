import os
import json
import glob
from acdh_tei_pyutils.tei import TeiReader
from saxonche import PySaxonProcessor

edition_dir = "./edition/data"

with PySaxonProcessor(license=False) as proc:
    print(f"using {proc.version}")
    
# os.makedirs(
#     os.path.dirname(output_dir),
#     exist_ok=True
# )

def xpath(xpath: str, file_path: str,):
    with PySaxonProcessor(license=False) as proc:
        xpath_proc = proc.new_xpath_processor()
        print(f"cwd: {xpath_proc.cwd}")
        xpath_proc.set_context(file_name = file_path)
        xpath_proc.declare_namespace("tei", "http://www.tei-c.org/ns/1.0")
        result = xpath_proc.evaluate(xpath)
        return result


# load file
# for file in glob.glob(edition_dir + "/*.xml"):
file = "data/editions/sfe-1901-002__1901.1.xml"
print(f"processing {file}")
div = xpath("//tei:body/tei:div[1]", file)
# generate string from xml
xml_string = str(div)
# now loop over the string and generate a string version without xml tags that links to the original xml

tag_open = False
prev_char = ""
new_char_index = 0
for xml_string_index in range(0, max_index):
    char = xml_string[xml_string_index]
    if char == "<":
        tag_open = True
    elif char == ">":
        tag_open = False
    elif char == " " and prev_char == " ":
        pass
    elif char in ["\n", "\t"]:
        pass
    elif tag_open:
        pass
    else:
        char_list.append(char)
        xml_to_text[xml_string_index] = new_char_index
        text_to_xml[new_char_index] = xml_string_index
    prev_char = char if not tag_open else prev_char
    new_char_index += 1
text_string = "".join(char_list)

n = 25
offset = 45
print(text_string[n:n+offset])
start = text_to_xml[n]
end = text_to_xml[n+offset]
print(xml_string[start:end])