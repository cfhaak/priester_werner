import ColumnViewerConfig from "./column_viewer_config.js";

// this class only hold the data representing the current state of the synoptic view
class EditionState {
  constructor(witness_metadata, sortedWitnessIds) {
    this.witness_metadata = witness_metadata;
    this.sortedWitnessIds = sortedWitnessIds;
    this.snippetsByLabels = {};
    this.columns = []; // [{id, witnessId}]
    this.globalScroll = false;
    this.displayEmptyLines = true;
    this.displayLinenrGlobal = true;
    this.displayLinenrLocal = false;
    this.columnIdToColumnIndex = {};
    this.columnCount = 0;
    this.lastDoubleClickedElementId = null;
    this.currentSelectedElement = null;
    this.currentSelectedColumn = null;
    this.highlightedSpans = [];
  }

  getCurrentSelectedElement() {
    return this.currentSelectedElement;
  }

  setCurrentSelectedElement(element) {
    this.currentSelectedElement = element;
  }

  getCurrentSelectedWitness() {
    return this.currentSelectedColumn;
  }

  setCurrentSelectedWitness(element) {
    this.currentSelectedColumn = element;
  }

  getIndexByColumnId(columnId) {
    return this.columnIdToColumnIndex[columnId];
  }

  addColumn(witnessId) {
    this.columnCount++;
    const columnId = `Witness_column_${String(this.columnCount).padStart(
      2,
      "0"
    )}`;
    this.columns.push({ id: columnId, witnessId });
    this.columnIdToColumnIndex[columnId] = this.columns.length - 1;
    return columnId;
  }

  removeColumn(columnId) {
    this.columns = this.columns.filter((col) => col.id !== columnId);
    delete this.columnIdToColumnIndex[columnId];
    this.columnCount--;
    // Update indices in columnIdToColumnIndex
    this.columns.forEach((col, index) => {
      this.columnIdToColumnIndex[col.id] = index;
    });
  }

  updateColumnWitness(columnId, witnessId) {
    const col = this.columns.find((col) => col.id === columnId);
    console.assert(col, `Column with id ${columnId} not found.`);
    if (col) col.witnessId = witnessId;
  }

  getColumn(columnId) {
    return this.columns.find((col) => col.id === columnId);
  }

  getAllColumns() {
    return this.columns;
  }

  resetColumns() {
    this.columns = [];
    this.columnCount = 0;
  }
}

// this class manages the rendering and the interaction with user/dom
class EditionManager {
  constructor(state, config) {
    this.state = state;
    this.config = config;
    this.ariaElement = this.makeAriaElement();
    this.witnessContainer = document.getElementById(
      this.config.witnessContainerId
    );
    this.columnElements = [];
    this.initListeners();
  }

  updateUrlWithState() {
    const params = new URLSearchParams();
    const loadedWitnessIds = this.state
      .getAllColumns()
      .map((col) => col.witnessId);
    params.set("witnessIds", loadedWitnessIds.join(","));
    const currentLineId = this.state.lastDoubleClickedElementId
      ? this.state.lastDoubleClickedElementId
      : this.getCurrentSelectedElement().getAttribute("id");
    if (currentLineId) {
      params.set("currentLine", currentSelectedElementId);
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }

  getOneIndexByColumnId(columnId) {
    return this.state.getIndexByColumnId(columnId) + 1;
  }

  makeAriaElement() {
    const liveRegion = document.createElement("div");
    liveRegion.id = "aria-live-region";
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.style.position = "absolute";
    liveRegion.style.left = "-9999px"; // Hide it visually but keep it accessible
    document.body.appendChild(liveRegion);
    return liveRegion;
  }

  sendAriaMessage(message) {
    this.ariaElement.textContent = message;
    // console.log(`Aria message sent: ${message}`);
  }

  reloadFromState(newState) {
    this.state = newState;
    this.witnessContainer.innerHTML = "";
    this.renderAllColumns();
    if (this.state.lastDoubleClickedElementId) {
      this.handleDoubleClick("", this.state.lastDoubleClickedElementId);
    }
  }

  enterTargetsTextContent(event) {
    return (
      event.target.matches(`.${this.config.witness_line_class}`) &&
      event.key === "Enter"
    );
  }

  eventTargetsWitnessContent(event) {
    return (
      event.target.matches(`.${this.config.text_content_class}`) ||
      event.target.matches(`.${this.config.text_content_class} > *`)
    );
  }

  arrowDownAction(event) {
    // Prevent default scrolling behavior
    event.preventDefault();
    let currentElement = this.getCurrentSelectedElement();
    if (!currentElement) {
      // Focus the first child if no element is currently selected
      const textContentParent = this.getTextContentParent(event);
      const firstChild = textContentParent.firstElementChild;
      if (firstChild) {
        this.updateFocusState(firstChild, textContentParent, false);
      }
    } else {
      const currentTextContent = this.getTextContentParent(event);
      // check if the focussed column has changed
      if (currentTextContent != this.getCurrentSelectedWitness()) {
        // column was changed
        // get the line id of the last selected line
        const currentLineId = this.state
          .getCurrentSelectedElement()
          .getAttribute("id");
        let currentLineInNewWitness = event.target.querySelector(
          `#${currentLineId}`
        );
        if (!this.elementIsVisible(currentLineInNewWitness)) {
          currentLineInNewWitness = this.findNearestVisibleSibling(
            currentLineInNewWitness,
            true
          );
        }
        this.handleDoubleClick(currentLineInNewWitness);
      } else {
        // Move focus to the next sibling
        let nextElement = this.getCurrentSelectedElement().nextElementSibling;
        if (!nextElement) {
          return null;
        }
        if (!this.elementIsVisible(nextElement)) {
          nextElement = this.findNearestVisibleSibling(nextElement, true);
        }
        if (nextElement) {
          this.updateFocusState(nextElement, null, false);
        }
      }
    }
  }

  arrowUpAction(event) {
    event.preventDefault(); // Prevent default scrolling behavior
    let selectedTextContentParent = this.getCurrentSelectedWitness();
    let newElement = null;
    if (!selectedTextContentParent) {
      // Focus the first child if no element is currently selected
      selectedTextContentParent = this.getTextContentParent(event);
      newElement = selectedTextContentParent.querySelector(
        `.${this.config.witness_line_class}`
      );
    } else {
      // Move focus to the previous sibling
      newElement = this.getCurrentSelectedElement().previousElementSibling;
      if (!newElement) {
        return null;
      }
    }
    if (!this.elementIsVisible(newElement)) {
      newElement = this.findNearestVisibleSibling(newElement);
    }
    this.updateFocusState(newElement, selectedTextContentParent, false);
  }

  horizontalActionTrigger(event) {
    return (
      (event.key === "ArrowRight" || event.key === "ArrowLeft") &&
      event.target.matches(
        `.${this.config.text_content_class}, .${this.config.text_content_class} > *`
      )
    );
  }

  getDefaultElement() {
    if (this.state.getCurrentSelectedWitness()) {
      const element = this.state
        .getCurrentSelectedWitness()
        .querySelector(`.${this.config.witness_line_class}`);
      this.state.setCurrentSelectedElement(element);
      return element;
    } else {
      const element = this.getDefaultWitness().querySelector(
        `.${this.config.witness_line_class}`
      );
      this.state.setCurrentSelectedElement(element);
      return element;
    }
  }

  getDefaultWitness() {
    const witness = this.columnElements
      ? this.columnElements[0].querySelector(
          `.${this.config.text_content_class}`
        )
      : null;
    if (witness) {
      this.state.setCurrentSelectedWitness(witness);
      return witness;
    } else {
      console.log("cant find content, reloading page");
      window.location.reload();
    }
  }

  getCurrentSelectedElement() {
    const element =
      this.state.getCurrentSelectedElement() ||
      this.getDefaultElement() ||
      null;
    return element;
  }

  getCurrentSelectedWitness() {
    const witness =
      this.state.getCurrentSelectedWitness() ||
      this.getDefaultWitness() ||
      null;
    return witness;
  }

  arrowHorizontalAction(event) {
    event.preventDefault();
    // get current selectedWitness
    const textContentColumn = event.target.closest(
      `.${this.config.witness_class}`
    );
    const targetColumn =
      event.key === "ArrowRight"
        ? textContentColumn.nextElementSibling || null
        : textContentColumn.previousElementSibling;
    if (!targetColumn) {
      return null;
    }
    const textContentParent = targetColumn.querySelector(
      `.${this.config.text_content_class}`
    );
    const currentLineId = this.getCurrentSelectedElement()
      ? this.getCurrentSelectedElement().getAttribute("id")
      : textContentParent
          .querySelector(`.${this.config.witness_line_class}`)
          .getAttribute("id");
    let currentLineInNewWitness =
      textContentParent.querySelector(`#${currentLineId}`) ||
      textContentParent.childNodes[0];
    if (!this.elementIsVisible(currentLineInNewWitness)) {
      currentLineInNewWitness = this.findNearestVisibleSibling(
        currentLineInNewWitness,
        true
      );
    }
    this.handleDoubleClick(currentLineInNewWitness);
  }

  getNthtSibling(textContentParent, currentElement, n) {
    const siblings = textContentParent.querySelectorAll(
      `.${this.config.witness_line_class}`
    );
    const rawIndex = Array.prototype.indexOf.call(siblings, currentElement) + n;
    const newIndex = Math.max(0, Math.min(rawIndex, siblings.length - 1));
    const sibling = siblings ? siblings[newIndex] : null;
    return sibling;
  }

  scrollWitnessContainer(event) {
    event.preventDefault();
    const textContentParent = this.getTextContentParent(event);
    const currentElement = this.getCurrentSelectedElement();
    const siblingToFocus = this.getNthtSibling(
      textContentParent,
      currentElement,
      event.key === "PageDown" ? 20 : -20
    );
    if (!siblingToFocus) {
      return null;
    }
    siblingToFocus.scrollIntoView({
      behavior: "smooth", // Optional: 'auto' (default) or 'smooth' for smooth scrolling
      block: "center", // Optional: 'start', 'center', 'end', or 'nearest' (vertical alignment)
      inline: "nearest", // Optional: 'start', 'center', 'end', or 'nearest' (horizontal alignment)
    });
    this.updateFocusState(siblingToFocus, textContentParent, false);
  }

  initKeyDownListeners() {
    this.witnessContainer.addEventListener("keydown", (event) => {
      // Enter key triggers the synoptic scroll event
      if (this.enterTargetsTextContent(event)) {
        this.handleDoubleClick(event.target);
      }
      // Keydown targets contents of text column
      else if (this.eventTargetsWitnessContent(event)) {
        if (event.key === "ArrowDown") {
          this.arrowDownAction(event);
        } else if (event.key === "ArrowUp") {
          this.arrowUpAction(event);
        } else if (this.horizontalActionTrigger(event)) {
          this.arrowHorizontalAction(event);
        } else if (event.key === "PageDown" || event.key === "PageUp") {
          this.scrollWitnessContainer(event);
        }
      }
    });
  }

  initClickListeners() {
    // doubleclick triggers scroll
    this.witnessContainer.addEventListener("dblclick", (event) => {
      const line = event.target.closest(`.${this.config.witness_line_class}`);
      this.handleDoubleClick(line);
    });
    // click closes column
    this.witnessContainer.addEventListener("click", (event) => {
      if (event.target.matches(`.${this.config.remove_column_button_class}`)) {
        const columnId = event.target.closest(
          `.${this.config.witness_class}`
        ).id;
        this.removeColumn(columnId);
      } else if (event.target.matches(`.${this.config.witness_line_class}`)) {
        const line = event.target.closest(`.${this.config.witness_line_class}`);
        const textContentParent = this.getTextContentParent(line);
        this.updateFocusState(line, textContentParent);
      }
    });
  }

  initDropDownListener() {
    this.witnessContainer.addEventListener("change", (event) => {
      if (event.target.matches(`.${this.config.dropdown_class}`)) {
        const columnId = event.target.getAttribute("data-column-id");
        this.updateColumnWitness(columnId, event.target.value);
      }
    });
  }

  initListeners() {
    this.initDropDownListener();
    this.initClickListeners();
    this.initKeyDownListeners();
  }

  async getSnippet(witnessId) {
    if (this.state.snippetsByLabels[witnessId]) {
      return this.state.snippetsByLabels[witnessId].cloneNode(true);
    }
    try {
      const response = await fetch(
        this.state.witness_metadata[witnessId].filepath
      );
      if (!response.ok) {
        return `Resource '${this.state.witness_metadata[witnessId].filepath}' couldn't be loaded.`;
      }
      const htmlText = await response.text();
      const snippetBody = new DOMParser().parseFromString(
        htmlText,
        "text/html"
      ).body;
      this.state.snippetsByLabels[witnessId] = snippetBody;
      return snippetBody.cloneNode(true);
    } catch (error) {
      dummyDiv = document.createElement("div");
      errorSpan = document.createElement("span");
      errorSpan.textContent = `Resource '${this.state.witness_metadata[witnessId].filepath}' couldn't be loaded. ${error.message}`;
      dummyDiv.appendChild(errorSpan);
      return dummyDiv;
    }
  }

  generateDropdown(columnId, currentWitnessId) {
    const dropdown = document.createElement("select");
    dropdown.className = this.config.dropdown_class;
    dropdown.setAttribute("data-column-id", columnId);
    dropdown.setAttribute(
      "aria-label",
      `Select witness for column ${columnId}`
    );
    dropdown.id = `dropdown-${columnId}`;
    this.state.sortedWitnessIds.forEach((witnessId) => {
      const option = document.createElement("option");
      option.value = witnessId;
      option.textContent = this.state.witness_metadata[witnessId].title;
      if (witnessId === currentWitnessId) {
        option.selected = true;
      }
      dropdown.appendChild(option);
    });
    return dropdown;
  }

  createTextContentDiv(cssClass, witnessId) {
    const textContentDiv = document.createElement("div");
    textContentDiv.className = `${this.config.text_content_class} ${cssClass}`;
    textContentDiv.setAttribute("role", "document");
    textContentDiv.setAttribute("tabindex", "0");
    textContentDiv.setAttribute(
      "aria-label",
      `Text content for ${this.state.witness_metadata[witnessId].title}`
    );
    textContentDiv.textContent =
      this.state.witness_metadata[witnessId].title || "Error while loading.";
    return textContentDiv;
  }

  createControlsContainer(columnId, witnessId) {
    const controlsContainer = document.createElement("div");
    controlsContainer.className = this.config.controls_container_class;
    controlsContainer.appendChild(this.generateDropdown(columnId, witnessId));
    const removeColButton = document.createElement("button");
    controlsContainer.appendChild(removeColButton);
    removeColButton.className = this.config.remove_column_button_class;
    removeColButton.title = this.config.label_remove_column;
    removeColButton.setAttribute(
      "aria-label",
      `Remove column for ${this.state.witness_metadata[witnessId].title}`
    );
    removeColButton.innerHTML = "&times;";
    return controlsContainer;
  }

  createColumnHTML(columnId, witnessId) {
    const cssClass = this.state.globalScroll
      ? this.config.GLOBAL_SCROLL_CLASS
      : this.config.INDIVIDUAL_SCROLL_CLASS;
    const columnDiv = document.createElement("div");
    columnDiv.id = columnId;
    columnDiv.className = `${this.config.witness_class} ${cssClass}`;
    columnDiv.setAttribute("role", "region");
    columnDiv.setAttribute(
      "aria-label",
      `Column for ${this.state.witness_metadata[witnessId].title}`
    );
    columnDiv.appendChild(this.createControlsContainer(columnId, witnessId));
    columnDiv.appendChild(this.createTextContentDiv(cssClass, witnessId));
    return columnDiv;
  }

  async renderAllColumns() {
    this.witnessContainer.innerHTML = "";
    const docFragment = document.createDocumentFragment();
    for (const col of this.state.getAllColumns()) {
      const columnHTML = this.createColumnHTML(col.id, col.witnessId);
      docFragment.appendChild(columnHTML);
    }
    this.witnessContainer.appendChild(docFragment);
    const renderPromises = this.state
      .getAllColumns()
      .map((col) => this.renderColumn(col.id));
    await Promise.all(renderPromises);
    this.applyScrollSettings();
    this.applyVisibilitySettings();
  }

  async renderColumn(columnId) {
    const col = this.state.getColumn(columnId);
    if (!col) return;
    const snippetBody = await this.getSnippet(col.witnessId);
    this.updateColumnContent(col.id, snippetBody);
    this.applyScrollSettings(columnId);
    this.applyVisibilitySettings(columnId);
  }

  addColumnContainer(witnessId) {
    const columnId = this.state.addColumn(witnessId);
    const columnElement = this.createColumnHTML(columnId, witnessId);
    this.witnessContainer.appendChild(columnElement);
    this.columnElements.push(columnElement);
    return columnId;
  }

  async addColumn(witnessId) {
    const columnId = this.addColumnContainer(witnessId);
    await this.renderColumn(columnId);
    this.sendAriaMessage(
      `Column ${this.getOneIndexByColumnId(columnId)} for ${
        this.state.witness_metadata[witnessId].title
      } added. ${this.state.columnCount} columns in total.`
    );
  }

  async removeColumn(columnId) {
    const oldColumnId = this.getOneIndexByColumnId(columnId);
    this.state.removeColumn(columnId);
    const colElem = document.getElementById(columnId);
    this.columnElements.pop(colElem);
    if (colElem) colElem.remove();
    this.sendAriaMessage(
      `Column ${oldColumnId} removed. ${this.state.columnCount} columns remaining.`
    );
  }

  async updateColumnWitness(columnId, witnessId) {
    this.state.updateColumnWitness(columnId, witnessId);
    await this.renderColumn(columnId);
    this.sendAriaMessage(
      `Column ${this.getOneIndexByColumnId(columnId)} for ${
        this.state.witness_metadata[witnessId].title
      } updated.`
    );
  }

  async addNewColumn() {
    const witnessId =
      this.state.sortedWitnessIds[this.state.columnCount] ||
      this.state.sortedWitnessIds[0];
    await this.addColumn(witnessId);
  }

  toggleScrollingBehaviour() {
    this.state.globalScroll = !this.state.globalScroll;
    this.applyScrollSettings();
    this.sendAriaMessage(
      `Global, parallel scrolling of all witnesses is now ${
        this.state.globalScroll ? "enabled" : "disabled"
      }.`
    );
  }

  toggleEmptyLinesVisibility() {
    this.state.displayEmptyLines = !this.state.displayEmptyLines;
    this.applyVisibilitySettings();
    this.sendAriaMessage(
      `Empty lines are now ${
        this.state.displayEmptyLines ? "visible" : "hidden"
      }.`
    );
  }

  toggleGlobalLinecounterVisibility() {
    this.state.displayLinenrGlobal = !this.state.displayLinenrGlobal;
    this.applyVisibilitySettings();
    this.sendAriaMessage(
      `Global line numbers are now ${
        this.state.displayLinenrGlobal ? "visible" : "hidden"
      }.`
    );
  }

  toggleLocalLinecounterVisibility() {
    this.state.displayLinenrLocal = !this.state.displayLinenrLocal;
    this.applyVisibilitySettings();
    this.sendAriaMessage(
      `Local line numbers are now ${
        this.state.displayLinenrLocal ? "visible" : "hidden"
      }.`
    );
  }

  updateColumnContent(columnId, snippetBody) {
    const columnElement = document.getElementById(columnId);
    if (!columnElement) return;
    const textContentElement = columnElement.querySelector(
      `.${this.config.text_content_class}`
    );
    if (textContentElement) {
      if (snippetBody instanceof HTMLElement) {
        textContentElement.replaceChildren(...snippetBody.childNodes);
      }
    } else {
      textContentElement.innerHTML = "Error while loading...";
    }
  }

  setEmptyLinesVisibility(textContentElement) {
    textContentElement
      .querySelectorAll(
        `.${this.config.witness_line_class}.${this.config.omitted_line_class}`
      )
      .forEach((line) => {
        line.classList.toggle(
          this.config.hidden_element_class,
          !this.state.displayEmptyLines
        );
      });
  }

  setGlobalLinecounterVisibility(textContentElement) {
    textContentElement
      .querySelectorAll(`.${this.config.global_line_counter_class}`)
      .forEach((line) => {
        line.classList.toggle(
          this.config.hidden_element_class,
          !this.state.displayLinenrGlobal
        );
      });
  }

  setLocalLinecounterVisibility(textContentElement) {
    textContentElement
      .querySelectorAll(`.${this.config.local_line_counter_class}`)
      .forEach((line) => {
        line.classList.toggle(
          this.config.hidden_element_class,
          !this.state.displayLinenrLocal
        );
      });
  }

  applyScrollSettings(columnId = null) {
    if (columnId) {
      const columnElement = document.getElementById(columnId);
      if (columnElement) {
        const textContent = columnElement.querySelector(
          `.${this.config.text_content_class}`
        );
        this.toggleScrollClass(textContent, this.state.globalScroll);
        this.toggleScrollClass(columnElement, this.state.globalScroll);
      }
    } else {
      const text_contents = this.witnessContainer.getElementsByClassName(
        this.config.text_content_class
      );
      const witnesses = this.witnessContainer.getElementsByClassName(
        this.config.witness_class
      );
      for (const text_content of text_contents) {
        this.toggleScrollClass(text_content, this.state.globalScroll);
      }
      for (const witness of witnesses) {
        this.toggleScrollClass(witness, this.state.globalScroll);
      }
    }
  }

  applyVisibilitySettings(columnId = null) {
    if (columnId) {
      const columnElement = document.getElementById(columnId);
      if (columnElement) {
        const textContent = columnElement.querySelector(
          `.${this.config.text_content_class}`
        );
        this.setEmptyLinesVisibility(textContent);
        this.setGlobalLinecounterVisibility(textContent);
        this.setLocalLinecounterVisibility(textContent);
      }
    } else {
      const text_contents = this.witnessContainer.getElementsByClassName(
        this.config.text_content_class
      );
      for (const text_content of text_contents) {
        this.setEmptyLinesVisibility(text_content);
        this.setGlobalLinecounterVisibility(text_content);
        this.setLocalLinecounterVisibility(text_content);
      }
    }
  }

  toggleScrollClass(element, globalScroll) {
    if (element) {
      element.classList.toggle(
        this.config.INDIVIDUAL_SCROLL_CLASS,
        !globalScroll
      );
      element.classList.toggle(this.config.GLOBAL_SCROLL_CLASS, globalScroll);
    }
  }

  elementIsVisible(element) {
    console.log(element);
    if (
      !element.classList.contains(this.config.omitted_line_class) &&
      !element.classList.contains(this.config.hidden_element_class) &&
      element.hasAttribute("id")
    ) {
      return true;
    } else {
      return false;
    }
  }

  findNearestVisiblePreviousSibling(element) {
    let sibling = element.previousElementSibling;
    while (sibling) {
      if (this.elementIsVisible(sibling)) {
        return sibling; // Return the first visible previous sibling
      }
      sibling = sibling.previousElementSibling;
    }
    return null;
  }

  findNearestVisibleFollowingSibling(element) {
    let sibling = element.nextElementSibling;
    while (sibling) {
      if (this.elementIsVisible(sibling)) {
        return sibling; // Return the first visible next sibling
      }
      sibling = sibling.nextElementSibling;
    }
    return null;
  }

  findNearestVisibleSibling(element, followingFirst = false) {
    if (followingFirst) {
      return (
        this.findNearestVisibleFollowingSibling(element) ||
        this.findNearestVisiblePreviousSibling(element) ||
        element
      );
    } else {
      return (
        this.findNearestVisiblePreviousSibling(element) ||
        this.findNearestVisibleFollowingSibling(element) ||
        element
      );
    }
  }

  getTextContentParent(elementOrEvent) {
    if (elementOrEvent instanceof HTMLElement) {
      return elementOrEvent.closest(`.${this.config.text_content_class}`);
    } else if (elementOrEvent instanceof Event) {
      return elementOrEvent.target.classList.contains(
        this.config.text_content_class
      )
        ? elementOrEvent.target
        : elementOrEvent.target.closest(
            `div.${this.config.text_content_class}`
          );
    } else {
      console.error(
        `Provided input ${elementOrEvent} is neither a valid HTML element nor an event.`
      );
      return null;
    }
  }

  updateFocusState(
    selectedElement,
    textContentParent,
    fromDoubleClick = false
  ) {
    if (!selectedElement) {
      return null;
    }
    selectedElement.focus();
    if (!textContentParent) {
      this.state.setCurrentSelectedWitness(
        this.getTextContentParent(selectedElement)
      );
    } else {
      this.state.setCurrentSelectedWitness(textContentParent);
    }
    this.state.setCurrentSelectedElement(selectedElement);
    const elementId = selectedElement.getAttribute("id");
    if (fromDoubleClick) {
      this.state.lastDoubleClickedElementId = elementId;
    }
    return elementId;
  }

  removeHighlights(event, spanId) {
    if (
      !event.target.closest(
        `.${this.config.text_content_class} span[id="${spanId}"]`
      )
    ) {
      this.state.highlightedSpans.forEach((span) => {
        span.classList.remove(this.config.highlight_class);
        span.classList.remove(this.config.neigh_class);
      });
      this.witnessContainer.removeEventListener("click", this.removeHighlights);
    }
  }

  handleDoubleClick(element) {
    console.log(element);
    const textContentParent = this.getTextContentParent(element);
    const spanId = this.updateFocusState(element, textContentParent, true);
    console.assert(
      spanId,
      `Couldn't get id-Attribute from doubleclicked element ${element}. Better check your markup.`
    );
    // Remove existing highlights
    this.witnessContainer
      .querySelectorAll(
        `.${this.config.text_content_class} span.${this.config.highlight_class}, .${this.config.text_content_class} span.${this.config.neigh_class}`
      )
      .forEach((span) => {
        span.classList.remove(this.config.highlight_class);
        span.classList.remove(this.config.neigh_class);
      });
    if (!spanId) {
      return null;
    }
    // Find all matching spans with the same ID
    const matchingSpans = this.witnessContainer.querySelectorAll(
      `.${this.config.text_content_class} span[id="${spanId}"]`
    );

    // Highlight matching spans or their nearest visible siblings
    this.state.highlightedSpans = [];
    matchingSpans.forEach((span) => {
      if (this.elementIsVisible(span)) {
        // Highlight the span if it's visible
        span.classList.add(this.config.highlight_class);
        span.scrollIntoView({ behavior: "smooth", block: "center" });
        this.state.highlightedSpans.push(span);
      } else {
        // Find the nearest visible sibling if the span is hidden
        const nearestVisibleSibling = this.findNearestVisibleSibling(span);
        if (nearestVisibleSibling) {
          nearestVisibleSibling.classList.add(this.config.highlight_class);
          nearestVisibleSibling.classList.add(this.config.neigh_class);
          nearestVisibleSibling.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          this.state.highlightedSpans.push(nearestVisibleSibling);
        }
      }
    });

    // Attach the listener to the container instead of the document
    this.witnessContainer.addEventListener("click", (event, spanId) =>
      this.removeHighlights(event, spanId)
    );
  }

  async initColumns() {
    let columnIds = [];
    if (this.config.fetch_all_witnesses) {
      for (const witnessId of this.state.sortedWitnessIds) {
        const columnId = this.addColumnContainer(witnessId);
        columnIds.push(columnId);
      }
    } else {
      for (let i = 1; i <= this.config.defaultColumnNumber; i++) {
        const witnessId = this.state.sortedWitnessIds[i - 1];
        if (witnessId) {
          const columnId = this.addColumnContainer(witnessId);
          columnIds.push(columnId);
        }
      }
    }
    await Promise.all(columnIds.map((id) => this.renderColumn(id)));
    this.sendAriaMessage(
      `Initialized ${this.state.columnCount} columns with witnesses.`
    );
    this.state.columns.forEach((col, index) => {
      this.sendAriaMessage(
        `Column ${index + 1} for ${
          this.state.witness_metadata[col.witnessId].title
        } initialized.`
      );
    });
  }
}

// --- HELPERS ---

async function loadConfig() {
  return new ColumnViewerConfig();
}

function sortWitnessIdsBySorting(metadata) {
  return Object.entries(metadata)
    .sort((a, b) => a[1].sorting.localeCompare(b[1].sorting))
    .map(([key]) => key);
}

async function loadSnippetMetadata(config) {
  try {
    const response = await fetch(config.snippetLogPath);
    if (!response.ok) {
      console.error(`Error loading snippet metadata: ${response.statusText}`);
      return {};
    } else {
      return response.json();
    }
  } catch (error) {
    console.error(`Error loading snippet metadata: ${error.message}`);
    return {};
  }
}

function addButton(containerId, text, onClick, ariaLabel) {
  const container = document.getElementById(containerId);
  if (container) {
    const button = document.createElement("button");
    button.textContent = text;
    button.onclick = onClick;
    if (ariaLabel) {
      button.setAttribute("aria-label", ariaLabel);
    }
    container.appendChild(button);
  }
}

function createControls(config, manager) {
  addButton(
    config.columnAdderId,
    config.label_column_adder,
    () => manager.addNewColumn(),
    "Add a new column"
  );
  addButton(
    config.scrollTogglerId,
    config.label_scroll_toggler,
    () => manager.toggleScrollingBehaviour(),
    "Toggle global scrolling behavior"
  );
  addButton(
    config.emptyLineTogglerId,
    config.label_empty_line_toggler,
    () => manager.toggleEmptyLinesVisibility(),
    "Toggle visibility of empty lines"
  );
  addButton(
    config.globalLinenrTogglerId,
    config.label_global_linenr_toggler,
    () => manager.toggleGlobalLinecounterVisibility(),
    "Toggle visibility of global line numbers"
  );
  addButton(
    config.localLinenrTogglerId,
    config.label_local_linenr_toggler,
    () => manager.toggleLocalLinecounterVisibility(),
    "Toggle visibility of local line numbers"
  );
  addButton(
    config.saveStateToUrlId,
    config.generateCitationUrlId,
    () => manager.updateUrlWithState(),
    "Save the current state to the URL"
  );

  const toggle = document.querySelector(
    `.${config.class_of_controls_container_toggler}`
  );
  const controls = document.querySelector(
    `.${config.class_of_controls_container}`
  );
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "controls-container");
  toggle.addEventListener("click", (e) => {
    const isOpen = controls.classList.toggle("open");
    toggle.setAttribute("aria-expanded", isOpen.toString());
    e.stopPropagation();
  });
  document.addEventListener("click", (e) => {
    if (!controls.contains(e.target) && !toggle.contains(e.target)) {
      controls.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}
// --- MAIN ---

document.addEventListener("DOMContentLoaded", async () => {
  const config = await loadConfig();
  const witness_metadata = await loadSnippetMetadata(config);
  const sortedWitnessIds = sortWitnessIdsBySorting(witness_metadata);
  const state = new EditionState(witness_metadata, sortedWitnessIds);
  const manager = new EditionManager(state, config);
  await manager.initColumns();
  createControls(config, manager);
});
