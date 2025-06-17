from lxml import etree
from stupid_statemachines import Tag
from random import randrange


class Textchunck:
    def __init__(
        self,
        id: str,
        element: etree._Element,
        xml_string: str,
        witness,
        replace_chars: dict = {},
        ignore_multi_whitespace: bool = True,
        skip_chars: list = ["\n", "\t"],
    ):
        self.id = id
        self.element: etree._Element = element
        self.witness = witness
        self.xml_string: str = xml_string
        self.replace_chars: dict = replace_chars
        self.ignore_multi_whitespace: bool = ignore_multi_whitespace
        self.skip_chars: list = skip_chars
        self.text_to_xml: dict = {}
        self.text_string: str = ""
        self.__char_list: list = []
        self.create_comparison_data(replace_chars, ignore_multi_whitespace, skip_chars)

    def __str__(self):
        return self.text_string

    def dump_xml(self):
        path = f"dump_{self.id}.dump".replace("/", "").replace("\\", "")
        with open(path, "w") as f:
            print(self.xml_string, file=f)
        return path
    
    @staticmethod
    def add_comment_to_element(element:etree.__Element, comment:str):
        element.addprevious(
            etree.Comment(
                comment
            )
        )
    
    def merge_tags(self, opening_tag: etree._Element, closing_tag: etree._Element, tag_id:str) -> None:
        opening_parent = opening_tag.getparent()
        if opening_parent.xpath(f"./*[@{Tag.get_temporary_id_attribute()}]")
        # closing_parent = closing_tag.getparent()


    def match_closing_tags(self, element: etree._Element) -> None:
        added_tags = map(
            lambda element: (
                element.attrib.get(Tag.get_temporary_id_attribute()),
                element,
            ),
            element.xpath(f".//*[@{Tag.get_temporary_id_attribute()}]")
        )
        ids_to_tags = {}
        failed_merges = 0
        for tag_id, element in added_tags:
            opening_tag = ids_to_tags.get(tag_id)
            if opening_tag is None:
                ids_to_tags[tag_id] = element
            else:
                unsolved = self.merge_tags(opening_tag, element, tag_id)
                if unsolved is not None:
                    failed_merges += 1
                    for element in unsolved:
                        Textchunck.add_comment_to_element(
                            element,
                            f"couldn't close tags with id = {tag_id}"
                        )
        

    def get_updated_xml(self):
        # print(self.xml_string[:100])
        # print(self.xml_string[100:])
        try:
            new_element = etree.fromstring(self.xml_string)
            return new_element
        except Exception as e:
            dump_path = self.dump_xml()
            e.add_note(f"dumped faulty markup to {dump_path}")
            raise e

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

    def insert_tag(
        self,
        tag: Tag,
        insert_before_index: int,
        insert_closing_after_index: int | None = None,
        log=False,
    ):
        internal_tag_id = self.witness.get_id()
        opening, closing = tag.get_pseudo_markup(internal_tag_id)
        if insert_closing_after_index is None:
            opening += closing
            self.insert_opening_tag(opening, insert_before_index)
        else:
            assert (
                insert_before_index <= insert_closing_after_index
            ), "The insert_closing_after_index value '{insert_closing_after_index}' is to small to tag anything."
            self.insert_opening_tag(opening, insert_before_index)
            self.insert_closing_tag(closing, insert_closing_after_index - 1)
        if log:
            offset = 20
            input(
                f"inserting tag between '{self.text_string[insert_before_index - offset : insert_before_index]}' and '{self.text_string[insert_before_index : insert_before_index + offset]}'"
            )

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
            t_string = self.text_string[start_text : start_text + offset]
            x_string = self.xml_string[start_xml:end_xml]

            print(t_string)
            print("\n", 60 * "-", "\n")
            print(x_string)

    def test(self):
        t = Tag("span", {"type": "versuch_01"})
        start = 44
        start_i = self.text_to_xml[start - 10]
        end_i = self.text_to_xml[150]
        print("xml:")
        print(self.xml_string[start_i:end_i])
        print("\n\n", 20 * "~", "-\n\n")
        print("text:")
        input(self.text_string[start : start + 10])
        self.insert_tag(t, start, start + 10)
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
