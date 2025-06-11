# import os
# import json
# import glob
import html
import json
from lxml import etree
from acdh_tei_pyutils.tei import TeiReader
from stupid_statemachines import Tag
from random import randrange
from collatex import Collation, collate

# from saxonche import PySaxonProcessor


# def xpath(
#     xpath: str,
#     file_path: str,
#     namespaces: dict = {"tei": "http://www.tei-c.org/ns/1.0"},
# ):
#     with PySaxonProcessor(license=False) as proc:
#         xpath_proc = proc.new_xpath_processor()
#         print(f"cwd: {xpath_proc.cwd}")
#         xpath_proc.set_context(file_name=file_path)
#         for namespace, uri in namespaces.items():
#             xpath_proc.declare_namespace(namespace, uri)
#         result = xpath_proc.evaluate(xpath)
#         assert not (result is None), f"xpath matched nothing in {file_path}"
#         return result


class Textchunck:
    def __init__(
        self,
        xml_string,
        witness,
        replace_chars: dict = {},
        ignore_multi_whitespace: bool = True,
        skip_chars: list = ["\n", "\t"],
    ):
        self.witness = witness
        self.xml_string = xml_string
        self.replace_chars = replace_chars
        self.ignore_multi_whitespace = ignore_multi_whitespace
        self.skip_chars = skip_chars
        self.text_to_xml = {}
        self.text_string = ""
        self.__char_list = []
        self.create_comparison_data(replace_chars, ignore_multi_whitespace, skip_chars)

    def __str__(self):
        return self.text_string
    
    def update_index(self, insert_before_index: int, offset: int):
        """offset : amount of characters being added at insert_before_index of the text string"""
        text_to_xml_keys_vals = [(key, val) for key, val in self.text_to_xml.items()]
        text_to_xml_keys_vals.sort(key=lambda x: x[0], reverse=True)
        changed = []
        for key, val in text_to_xml_keys_vals[insert_before_index:]:
            val += offset
            changed.append((key, val))
        self.text_to_xml.update(changed)

    def insert_closing_tag(self, closing_tag: str, insert_closing_after_index: int):
        xml_index = self.text_to_xml[insert_closing_after_index + 1]
        self.xml_string = (
            self.xml_string[:xml_index] + closing_tag + self.xml_string[xml_index:]
        )
        self.update_index(insert_closing_after_index + 1, len(closing_tag))

    def insert_opening_tag(self, opening_tag: str, insert_before_index: int):
        xml_index = self.text_to_xml[insert_before_index]
        self.xml_string = (
            self.xml_string[:xml_index] + opening_tag + self.xml_string[xml_index:]
        )
        self.update_index(insert_before_index, len(opening_tag))

    def place_tag(
        self,
        tag: Tag,
        insert_before_index: int,
        insert_closing_after_index: int | None = None,
    ):
        opening, closing = tag.get_pseudo_markup()
        if insert_closing_after_index is None:
            opening += closing
            self.insert_opening_tag(opening, insert_before_index)
        else:
            assert (
                insert_before_index <= insert_closing_after_index
            ), "The insert_closing_after_index value '{insert_closing_after_index}' is to small to tag anything."
            self.insert_opening_tag(opening, insert_before_index)
            self.insert_closing_tag(closing, insert_closing_after_index - 1)

    def result_test(self):
        string_len = len(self.text_string)
        if self.text_to_xml == {}:
            self.create_comparison_data()
        if string_len < 50:
            print(self.text_string)
            print(self.xml_string)
        else:
            offset = 45
            start_text = randrange(0, string_len - offset)
            start_xml = self.text_to_xml[start_text]
            end_xml = self.text_to_xml[start_text + offset]
            print(
                "\n\ncheck if the text in both strings is the same (was too lazy to implement this):\n\n"
            )
            print(self.text_string[start_text : start_text + offset])
            print("\n", 60 * "-", "\n")
            print(self.xml_string[start_xml:end_xml])
            
    def test(self):
        t = Tag("span", {"type": "versuch_01"})
        start = 44
        start_i = self.text_to_xml[start-10]
        end_i = self.text_to_xml[150]
        print("xml:")
        print(self.xml_string[start_i:end_i])
        print("\n\n", 20 * "~", "-\n\n")
        print("text:")
        input(self.text_string[start:start+10])
        self.place_tag(t, start, start+10)
        print("\n\nplaced tag:")
        input(self.xml_string[start_i:end_i])
        self.result_test()

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
        prev_text_char = ""
        prev_global_char = ""
        new_char_index = 0
        prev_tag = None
        for xml_string_index in range(0, max_index):
            char = self.xml_string[xml_string_index]
            prev_global_char = char
            if char == "<":
                prev_tag = Tag()
                tag_open = True
            elif char == ">":
                if (
                    prev_tag.name == "lb"
                    and prev_tag.get_attribute_val("break") == "no"
                    and prev_text_char == " "
                ):
                    self.__char_list.pop()
                    new_char_index -= 1
                tag_open = False
            elif tag_open:
                prev_tag.append_char(char)
            elif char == " " and prev_text_char == " " and ignore_multi_whitespace:
                pass
            elif (
                char == " "
                and prev_global_char == ">"
                and prev_tag.name == "lb"
                and prev_tag.get_attribute_val("break") == "no"
            ):
                pass
            elif char in skip_chars:
                pass
            else:
                if char in replace_chars:
                    char = replace_chars[char]
                self.__char_list.append(char)
                self.text_to_xml[new_char_index] = xml_string_index
                prev_text_char = char
                new_char_index += 1
        self.text_string = "".join(self.__char_list)


class Witness:
    def __init__(
        self,
        file_path: str,
        text_container_xpath: str,
        sigil="",
        # treat_result_as_list: bool = False,
        namespaces: dict = None,
        replace_chars: dict = {},
        ignore_multi_whitespace: bool = True,
        skip_chars: list = ["\n", "\t"],
    ):  
        self.sigil = sigil,
        # if namespaces is None:
        #     namespaces = {"tei": "http://www.tei-c.org/ns/1.0"}
        self.namespaces = namespaces if namespaces else {}
        self.file_path = file_path
        self.xml_doc = TeiReader(self.file_path)
        self.root = self.xml_doc.tree.getroot()
        self.text_container_elements = self.xpath(text_container_xpath)
        self.text_chuncks: tuple = []
        self.make_text_chuncks(replace_chars, ignore_multi_whitespace, skip_chars)
    
    
    def __str__(self):
        return "".join([str(chunck) for chunck in self.text_chuncks])
    
    def generate_collatex_data(self):
        for chunck in self.text_chuncks:
            yield f"{self.sigil}_{self.text_chuncks.index(chunck)}", str(chunck)
    
    def element_to_string(self, element):
        text = etree.tostring(element, encoding="unicode", method="text")
        return html.unescape(text)

    def make_text_chuncks(
        self, replace_chars: dict, ignore_multi_whitespace: bool, skip_chars: list
    ):
        for element in self.text_container_elements:
            xml_string = self.element_to_string(element)
            chunck = Textchunck(
                xml_string, self, replace_chars, ignore_multi_whitespace, skip_chars
            )
            self.text_chuncks.append(chunck)
        self.text_chuncks = tuple(self.text_chuncks)

    def xpath(self, xpath_query: str):
        if self.namespaces:
            self.tree.xpath(xpath_query, namespaces=self.namespaces)
        return self.xml_doc.any_xpath(xpath_query)
    
    

def test1():
    xpath_expr = "//tei:body/tei:div[1]//tei:div[@type='section']"
    xfstr_1 = Witness(
        file_path="../data/source/sfe-1901-002__1901.1_sections.xml",
        text_container_xpath=xpath_expr,
    )
    xfstr_2 = Witness(
        file_path="../data/source/sfe-1901-002__1901.3_sections.xml",
        text_container_xpath=xpath_expr,
    )

    w1 = xfstr_1
    for t in w1.text_chuncks:
        t.test()
        input()

xpath_expr = "//tei:body/tei:div[1]//tei:div[@type='section']"
witness_1 = Witness(
    file_path="../data/source/sfe-1901-002__1901.1_sections.xml",
    text_container_xpath=xpath_expr,
    sigil="witness_1"
)
witness_2 = Witness(
    file_path="../data/source/sfe-1901-002__1901.3_sections.xml",
    text_container_xpath=xpath_expr,
    sigil="witness_2"
)

collation = Collation()
collatex_data_wintess1 = list(witness_1.generate_collatex_data())
collatex_data_witness2 = list(witness_2.generate_collatex_data())
collation.add_plain_witness(*collatex_data_wintess1[0])
collation.add_plain_witness(*collatex_data_witness2[0])
alignment_table = collate(collation, output="json", layout="horizontal", segmentation=False)
json_tab = json.loads(alignment_table)
w1_table = json_tab["table"][0]
w2_table = json_tab["table"][1]
counter = 0
max_len = len(w1_table)
while max_len > counter:
    token_from_1 = w1_table[counter]["t"]
    # token_from_2 = w2_table[counter]["t"]
    print(token_from_1)
    # region_from_2 = w2_table[counter]
    # if region_from_1 is None:
    #     input(f"region {counter} is missing in w1")
    # if region_from_2 is None:
    #     input(f"region {counter} is missing in w1")
    # counter += 1
    # for t in region