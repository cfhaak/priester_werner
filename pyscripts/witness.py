import json
from lxml import etree
from collatex import Collation, collate
from tqdm import tqdm
from acdh_tei_pyutils.tei import TeiReader
from stupid_statemachines import Tag
from random import randrange
from textchunck import Textchunck
from collatex import Collation, collate


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
        self.sigil: str = sigil
        # if namespaces is None:
        #     namespaces = {"tei": "http://www.tei-c.org/ns/1.0"}
        self.namespaces: dict = namespaces if namespaces else {}
        self.file_path: str = file_path
        self.xml_doc: TeiReader = TeiReader(self.file_path)
        self.root: etree._Element = self.xml_doc.tree.getroot()
        self.text_container_elements = self.xpath(text_container_xpath)
        self.text_chuncks: tuple = []
        self.make_text_chuncks(replace_chars, ignore_multi_whitespace, skip_chars)
        self.__current_id_count = 0

    def __str__(self):
        return "".join([str(chunck) for chunck in self.text_chuncks])

    def get_id(self) -> str:
        self.__current_id_count += 1
        numberstring = str(self.__current_id_count).rjust(5, "0")
        return f"{self.sigil}_{numberstring}"

    def write_result(self, path: str = None):
        for chunck in self.text_chuncks:
            chunck: Textchunck
            source_element = chunck.element
            new_element = chunck.get_updated_xml()
            source_element.addnext(new_element)
            source_element.getparent().remove(source_element)
        path = self.file_path.removesuffix(".xml") + "modded.xml"
        print("writing to path: ", path)
        self.xml_doc.tree_to_file(path)

    def update_index(current_string_index: int, collatex_token: dict):
        return current_string_index

    def get_collations(self, witness, test=False) -> tuple[list, list, Textchunck, Textchunck]:
        collation = Collation()
        collatex_data_wintess1 = (
            self.get_collatex_data_list()
            if not test
            else self.get_collatex_data_list()[:1]
        )
        collatex_data_witness2 = (
            witness.get_collatex_data_list()
            if not test
            else witness.get_collatex_data_list()[:1]
        )
        assert len(collatex_data_wintess1) == len(
            collatex_data_witness2
        ), f"While wintess '{self.sigil}' contains {len(collatex_data_wintess1)} textchuncks witness '{witness.sigil}' contains {len(collatex_data_wintess1)}. Please make sure your xpath creates an equal amount of textchunks to compare."
        total_amount_of_chuncks = len(collatex_data_wintess1)
        for tc_index in range(0, total_amount_of_chuncks):
            print(f"collatex adding witness {self.sigil} chunck {tc_index + 1}")
            collation.add_plain_witness(*collatex_data_wintess1[tc_index])
            print(f"collatex adding witness {witness.sigil} chunck {tc_index + 1}")
            collation.add_plain_witness(*collatex_data_witness2[tc_index])
            print(
                f"Creating alignment table {tc_index +1} of {total_amount_of_chuncks}. This might take loooooong."
            )
            alignment_table = collate(
                collation, output="json", layout="horizontal", segmentation=False
            )
            print("\tdone")
            json_alignment = json.loads(alignment_table)
            w1_table = json_alignment["table"][0]
            w2_table = json_alignment["table"][1]
            yield w1_table, w2_table, self.text_chuncks[tc_index], witness.text_chuncks[
                tc_index
            ]

    def collatex_with_witness(
        self, witness, ignore_whitespace: bool = True, test=False
    ):
        assert type(witness) == type(
            self
        ), f"Atm you only can compare witness objects but the provided witness is of type {type(witness)}"
        print("checking results\n")
        token_counter = 0
        results = []
        field = "t" if not ignore_whitespace else "n"
        same_token_counter = 0
        for w1_table, w2_table, w1_chunck, w2_chunck in self.get_collations(
            witness,
            test
        ):
            w1_chunck: Textchunck
            w2_chunck: Textchunck
            w1_current_string_index = 0
            w2_current_string_index = 0
            for token in tqdm(w1_table):
                token_from_1 = (
                    token[0][field] if w1_table[token_counter] is not None else None
                )
                token_from_2 = (
                    w2_table[token_counter][0][field]
                    if w2_table[token_counter] is not None
                    else None
                )
                if token_from_1 is None:
                    results.append(f"witness_1 is missing '{token_from_2}'\n{30*'_'}")
                    full_token_2 = w2_table[token_counter][0]["t"]
                    tag = Tag("difftest_none")
                    tag.add_attribute("w2_has", token_from_2)
                    w2_chunck.insert_tag(tag, w2_current_string_index - 1)
                    w2_current_string_index += len(full_token_2)
                elif token_from_2 is None:
                    results.append(f"witness_2 is missing '{token_from_1}'\n{30*'_'}")
                    tag = Tag("difftest_none")
                    tag.add_attribute("w1_has", token_from_1)
                    w1_chunck.insert_tag(tag, w1_current_string_index)
                    full_token_1 = token[0]["t"]
                    w1_current_string_index += len(full_token_1)
                else:
                    full_token_1 = token[0]["t"]
                    full_token_2 = w2_table[token_counter][0]["t"]
                    if token_from_2 != token_from_1:
                        tag = Tag("difftest")
                        tag.add_attribute("w1_has", token_from_1)
                        w2_chunck.insert_tag(tag, w2_current_string_index - 1)
                        tag = Tag("difftest")
                        tag.add_attribute("w2_has", token_from_2)
                        w1_chunck.insert_tag(tag, w1_current_string_index - 1)
                        results.append(
                            f"witness_1: '{token_from_1}'\n\twitness_2: '{token_from_2}'\n{30*'_'}"
                        )
                    else:
                        # both the same
                        same_token_counter += 1
                    w1_current_string_index += len(full_token_1)
                    w2_current_string_index += len(full_token_2)
                token_counter += 1
        # print("results:")
        results.insert(0, f"{same_token_counter}tokens where the same")
        # print("\n\t".join(results))
        self.write_result()

    def get_collatex_data_list(self):
        return list(self.generate_collatex_data())

    def generate_collatex_data(self):
        print(f"generating collatex data for {self.sigil}")
        for chunck in self.text_chuncks:
            snippet_sigil = f"{self.sigil}_{self.text_chuncks.index(chunck)}"
            yield snippet_sigil, str(chunck)

    def element_to_string(self, element):
        text = etree.tostring(element, encoding="unicode")
        return text

    def make_text_chuncks(
        self, replace_chars: dict, ignore_multi_whitespace: bool, skip_chars: list
    ):
        counter = 0
        for element in self.text_container_elements:
            counter += 1
            assert isinstance(
                element, etree._Element
            ), f"Your xslt should return element nodes only, yours returned {type(element)}. Try to adress the parent elements of text elements."
            xml_string = self.element_to_string(element)
            chunck = Textchunck(
                f"{self.sigil}_{counter}",
                element,
                xml_string,
                self,
                replace_chars,
                ignore_multi_whitespace,
                skip_chars,
            )
            self.text_chuncks.append(chunck)
        self.text_chuncks = tuple(self.text_chuncks)

    def xpath(self, xpath_query: str):
        if self.namespaces:
            self.tree.xpath(xpath_query, namespaces=self.namespaces)
        return self.xml_doc.any_xpath(xpath_query)