# import os
# import json
# import glob
# from acdh_tei_pyutils.tei import TeiReader
from random import randrange
from saxonche import PySaxonProcessor


def xpath(
    xpath: str,
    file_path: str,
    namespaces: dict = {"tei": "http://www.tei-c.org/ns/1.0"},
):
    with PySaxonProcessor(license=False) as proc:
        xpath_proc = proc.new_xpath_processor()
        print(f"cwd: {xpath_proc.cwd}")
        xpath_proc.set_context(file_name=file_path)
        for namespace, uri in namespaces.items():
            xpath_proc.declare_namespace(namespace, uri)
        result = xpath_proc.evaluate(xpath)
        return result
    
class TextChunk:
    def __init__(self, char_list: list, xml_start_index: int, xml_end_index:int):
        pass
        
class XMLFileString:
    def __init__(
        self,
        file_path: str,
        text_container_xpath: str,
        # i need to find a way to treat a list of text_containers -> 
        # probably i need a chunk class and a generator holding the chunks …
        namespaces: dict = None,
        replace_chars: dict = {},
        ignore_multi_whitespace: bool = True,
        skip_chars: list = ["\n", "\t"],
    ):
        
        if namespaces is None:
            namespaces = {"tei": "http://www.tei-c.org/ns/1.0"}
        self.namespaces = namespaces
        self.file_path = file_path
        self.text_container_element = self.xpath(text_container_xpath)
        self.xml_string = str(self.text_container_element)
        self.xml_to_text = {}
        self.text_to_xml = {}
        self.text_string = ""
        self.char_list = []
        self.replace_chars = replace_chars
        self.ignore_multi_whitespace = ignore_multi_whitespace
        self.skip_chars = skip_chars
        self.create_comparison_data()
        
    def result_test(self):
        string_len = len(self.text_string)
        if self.xml_to_text == {}:
            self.create_comparison_data()
        if string_len < 50:
            print(self.text_string)
            print(self.xml_string)
        else:
            offset = 45
            start_text = randrange(0, string_len - offset)
            start_xml = self.text_to_xml[start_text]
            end_xml = self.text_to_xml[start_text+offset]
            print("\n\ncheck if the text in both strings is the same (was too lazy to implement this):\n\n")
            print(self.text_string[start_text:start_text+offset])
            print("\n", 60*"-", "\n")
            print(self.xml_string[start_xml:end_xml])

    def xpath(self, xpath_query: str):
        return xpath(xpath_query, self.file_path, self.namespaces)

    def create_comparison_data(
        self, replace_chars=None, ignore_multi_whitespace=None, skip_chars=None
    ):
        if replace_chars is None:
            replace_chars = self.replace_chars
        if ignore_multi_whitespace is None:
            ignore_multi_whitespace = self.ignore_multi_whitespace
        if skip_chars is None:
            skip_chars = self.skip_chars
        max_index = len(self.xml_string)
        tag_open = False
        prev_char = ""
        new_char_index = 0
        for xml_string_index in range(0, max_index):
            char = self.xml_string[xml_string_index]
            if char == "<":
                tag_open = True
            elif char == ">":
                tag_open = False
            elif tag_open:
                pass
            elif char == " " and prev_char == " " and ignore_multi_whitespace:
                pass
            elif char in skip_chars:
                pass
            else:
                if char in replace_chars:
                    char = replace_chars[char]
                self.char_list.append(char)
                self.xml_to_text[xml_string_index] = new_char_index
                self.text_to_xml[new_char_index] = xml_string_index
                prev_char = char
                new_char_index += 1
        self.text_string = "".join(self.char_list)


xpath_expr = "//tei:body/tei:div[1]"#//div[@type='section']"
xfstr_1 = Witness(
    file_path="../data/source/sfe-1901-002__1901.1_sections.xml",
    text_container_xpath=xpath_expr,
)
xfstr_2 = Witness(
    file_path="../data/source/sfe-1901-002__1901.3_sections.xml",
    text_container_xpath=xpath_expr,
)
t=Tag("span", {"type":"versuch_01"})
start_i = xfstr_1.text_to_xml[40]
end_i = xfstr_1.text_to_xml[150]
print( xfstr_1.xml_string[start_i:end_i])
print("\n\n",20*",","-\n\n")
input(xfstr_1.text_string[44:67])
xfstr_1.place_tag(t, 44, 54)
input(
    xfstr_1.xml_string[start_i:end_i]
)
xfstr_1.result_test()