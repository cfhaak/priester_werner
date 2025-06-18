class Attribute:
    def __init__(self, name: str = "", value = ""):
        self.name = name
        self.value = value

    def append_char_to_name(self, char: str):
        self.name += char

    def append_char_to_value(self, char: str):
        self.value += char

    def to_string(self):
        return f'{self.name} = "{self.value}"'

def get_app(sigil1:str, sigil2: str, rdg1:str, rdg2:str):
    tag = Tag("app")
    tag.add_child(
        Tag(
            "rdg",
            {"wit":sigil1},
            rdg1
        )
    )
    tag.add_child(
        Tag(
            "rdg",
            {"wit":sigil2},
            rdg2
        )
    )
    return tag
    

class Tag:
    # I know, I know
    # <([a-z]*) and
    # ([\w|data-]+)=[\"']?((?:.(?![\"']?\s+(?:\S+)=|\s*\/?[>\"']))+.)[\"']?
    # would have worked just fine, but state machines are fun! Especially if 
    # I created bugs, you’ll have to fix ;) have fun!!! fun!!! fun!!!
    __pseudo_markup_sequence_opening_start = "<"
    __pseudo_markup_sequence_opening_stop = "/>"
    __pseudo_markup_sequence_closing_start = "<"
    __pseudo_markup_sequence_closing_stop = "/>"
    __temporary_id_attrib_name = "internalTIAN"
    
    def __init__(self, name: str="", attributes: dict = {}, text: str = ""):
        assert not " " in name, f"Invalid tag name '{name}' provided."
        self.name = name
        self.__attributes = []
        self.__name_closed = False
        self.__attrib_val_open = False
        self.__attrib_name_open = False
        self.__attributes_dict = {}
        self.__text = text
        for key, val in attributes.items():
            attrib = Attribute(key, val)
            self.__attributes.append(attrib)
        self.children: list[Tag] = []
    
    @classmethod
    def get_app(sigil1:str, sigil2: str, rdg1:str, rdg2:str):
        tag = Tag("app")
        tag.add_child(
            Tag(
                "rdg",
                {"wit":sigil1},
                rdg1
            )
        )
        tag.add_child(
            Tag(
                "rdg",
                {"wit":sigil2},
                rdg2
            )
        )
        return tag
    
    def add_child(self, child):
        self.children.append(child)
        
    def add_attribute(self, key: str, value: str):
        self.__attributes.append(Attribute(key, value))
        self.__attributes_dict = None
        
    def append_char(self, char: str):
        if char not in ["\n", "\t", "/"]:
            if char == " ":
                if self.name == "":
                    # whitespace after <
                    pass
                else:
                    if self.__attrib_val_open:
                        self.__attributes[-1].append_char_to_value(char)
                    elif not self.__name_closed:
                        self.__name_closed = True
                    else:
                        pass
            elif char in ['"', "'"]:
                self.__attrib_val_open = not self.__attrib_val_open
            elif char == "=":
                self.__attrib_name_open = False
            else:
                if not self.__name_closed:
                    self.name += char
                elif self.__attrib_val_open:
                    self.__attributes[-1].append_char_to_value(char)
                elif self.__attrib_name_open:
                    self.__attributes[-1].append_char_to_name(char)
                else:
                    attrib = Attribute()
                    attrib.append_char_to_name(char)
                    self.__attributes.append(attrib)
                    self.__attrib_name_open = True

    def get_pseudo_markup(self, internal_tag_id: str) -> tuple[str, str]:
        internal_id_attrib = f"{self.__temporary_id_attrib_name}='{internal_tag_id}'"
        opening = f"{self.__pseudo_markup_sequence_opening_start}{self.name} {internal_id_attrib} {self.get_attributes_string()} {self.__pseudo_markup_sequence_opening_stop}"
        closing = f"{self.__pseudo_markup_sequence_closing_start}{self.name} {internal_id_attrib} {self.__pseudo_markup_sequence_closing_stop}"
        return (opening, closing)
        
    def get_attributes_string(self):
        attr_strings = [a.to_string() for a in self.__attributes]
        return " ".join(attr_strings)
    
    def get_attributes_dict(self):
        if not self.__attributes_dict:
            for attrib in self.__attributes:
                self.__attributes_dict[attrib.name] = attrib.value
        return self.__attributes_dict

    def get_attribute_val(self, attrib_name: str):
        val = self.get_attributes_dict().get(attrib_name)
        if val is None:
            return ""
        return val
    @staticmethod
    def get_temporary_id_attribute():
        return Tag.__temporary_id_attrib_name
