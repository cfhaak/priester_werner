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

class Tag:
    # I know, I know
    # <([a-z]*) and
    # ([\w|data-]+)=[\"']?((?:.(?![\"']?\s+(?:\S+)=|\s*\/?[>\"']))+.)[\"']?
    # would have worked just fine, but state machines are fun! Especially if 
    # I created bugs, you have to fix ;) have fun!!! fun!!! fun!!!
    pseudo_markup_sequence_opening_start = "(["
    pseudo_markup_sequence_opening_stop = "])"
    pseudo_markup_sequence_closing_start = "([|"
    pseudo_markup_sequence_closing_stop = "|])"
    
    def __init__(self, name: str="", attributes: dict = {}):
        self.name = name
        self.__attributes = []
        self.__name_closed = False
        self.__attrib_val_open = False
        self.__attrib_name_open = False
        self.__attributes_dict = {}
        for key, val in attributes.items():
            attrib = Attribute(key, val)
            self.__attributes.append(attrib)

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

    def get_pseudo_markup(self):
        opening = f"{self.pseudo_markup_sequence_opening_start}{self.name} {self.get_attributes_string()} {self.pseudo_markup_sequence_opening_stop}"
        closing = f"{self.pseudo_markup_sequence_closing_start}{self.name}{self.pseudo_markup_sequence_closing_stop}"
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
