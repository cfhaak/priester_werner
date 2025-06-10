# import os
# import json
# import glob
# from acdh_tei_pyutils.tei import TeiReader
from stupid_statemachines import Tag
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


class Witness:
    def __init__(
        self,
        file_path: str,
        text_container_xpath: str,
        # treat_result_as_list: bool = False,
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
        # self.xml_to_text = {}
        self.text_to_xml = {}
        self.text_string = ""
        self.__char_list = []
        self.replace_chars = replace_chars
        self.ignore_multi_whitespace = ignore_multi_whitespace
        self.skip_chars = skip_chars
        self.create_comparison_data()

    def update_index(self, insert_before_index: int, offset: int):
        """offset : amount of characters being added at insert_before_index of the text string"""
        text_to_xml_keys_vals = [(key,val) for key, val in self.text_to_xml.items()]
        text_to_xml_keys_vals.sort(key=lambda x:x[0], reverse=True)
        changed = []
        for key, val in text_to_xml_keys_vals[insert_before_index:]:
            val += offset
            changed.append((key, val))
        self.text_to_xml.update(changed)
            
    def insert_closing_tag(self, closing_tag: str, insert_closing_after_index: int):
        xml_index = self.text_to_xml[insert_closing_after_index + 1]
        self.xml_string = self.xml_string[:xml_index] + closing_tag + self.xml_string[xml_index:]
        self.update_index(
            insert_closing_after_index + 1,
            len(closing_tag)
        )
        
    def insert_opening_tag(self, opening_tag: str, insert_before_index: int):
        xml_index = self.text_to_xml[insert_before_index]
        self.xml_string = self.xml_string[:xml_index] + opening_tag + self.xml_string[xml_index:]
        self.update_index(
            insert_before_index,
            len(opening_tag)
        )
    
    def place_tag(self, tag: Tag, insert_before_index: int, insert_closing_after_index: int|None = None):
        opening, closing = tag.get_pseudo_markup()
        if insert_closing_after_index is None:
            opening += closing
            self.insert_opening_tag(opening, insert_before_index)
        else:
            assert insert_before_index <= insert_closing_after_index, "The insert_closing_after_index value '{insert_closing_after_index}' is to small to tag anything."
            self.insert_opening_tag(opening, insert_before_index)
            self.insert_closing_tag(closing, insert_closing_after_index-1)


            
            

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
                # self.xml_to_text[xml_string_index] = new_char_index
                self.text_to_xml[new_char_index] = xml_string_index
                prev_text_char = char
                new_char_index += 1
        self.text_string = "".join(self.__char_list)


# def test():
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
