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
    this.columnCount = 0;
  }

  addColumn(witnessId) {
    this.columnCount++;
    const columnId = `Witness_column_${String(this.columnCount).padStart(
      2,
      "0"
    )}`;
    this.columns.push({ id: columnId, witnessId });
    return columnId;
  }

  removeColumn(columnId) {
    this.columns = this.columns.filter((col) => col.id !== columnId);
  }

  updateColumnWitness(columnId, witnessId) {
    const col = this.columns.find((col) => col.id === columnId);
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
    this.witnessContainer = document.getElementById(
      this.config.witnessContainerId
    );
    this.initListeners();
  }

  initListeners() {
    this.witnessContainer.addEventListener("click", (event) => {
      if (event.target.matches(`.${this.config.remove_column_button_class}`)) {
        const columnId = event.target.closest(
          `.${this.config.witness_class}`
        ).id;
        this.removeColumn(columnId);
      }
    });

    this.witnessContainer.addEventListener("change", (event) => {
      if (event.target.matches(`.${this.config.dropdown_class}`)) {
        const columnId = event.target.getAttribute("data-column-id");
        this.updateColumnWitness(columnId, event.target.value);
      }
    });

    this.witnessContainer.addEventListener("dblclick", (event) => {
      const line = event.target.closest(`.${this.config.witness_line_class}`);
      if (line && this.witnessContainer.contains(line)) {
        const spanId = line.getAttribute("id");
        this.handleDoubleClick(event, spanId);
      }
    });
  }

  async getSnippet(witnessId) {
    if (this.state.snippetsByLabels[witnessId]) {
      return this.state.snippetsByLabels[witnessId];
    }
    try {
      const response = await fetch(
        this.state.witness_metadata[witnessId].filepath
      );
      if (!response.ok) {
        return `Resource '${this.state.witness_metadata[witnessId].filepath}' couldn't be loaded.`;
      }
      const htmlText = await response.text();
      const snippet = new DOMParser().parseFromString(htmlText, "text/html")
        .body.innerHTML;
      this.state.snippetsByLabels[witnessId] = snippet;
      return snippet;
    } catch (error) {
      return `Resource '${this.state.witness_metadata[witnessId].filepath}' couldn't be loaded. ${error.message}`;
    }
  }

  generateDropdown(columnId, currentWitnessId) {
    return `
      <select class="${
        this.config.dropdown_class
      }" data-column-id="${columnId}">
        ${this.state.sortedWitnessIds
          .map(
            (witnessId) =>
              `<option value="${witnessId}" ${
                witnessId === currentWitnessId ? "selected" : ""
              }>${this.state.witness_metadata[witnessId].title}</option>`
          )
          .join("")}
      </select>`;
  }

  createColumnHTML(columnId, witnessId) {
    const cssClass = this.state.globalScroll
      ? this.config.GLOBAL_SCROLL_CLASS
      : this.config.INDIVIDUAL_SCROLL_CLASS;
    return `
      <div id="${columnId}" class="${this.config.witness_class} ${cssClass}">
        <div class="${this.config.controls_container_class}">
          ${this.generateDropdown(columnId, witnessId)}
          <button class="${
            this.config.remove_column_button_class
          }" title="Remove Column">&times;</button>
        </div>
        <div class="${this.config.text_content_class} ${cssClass}">
          ${
            this.state.witness_metadata[witnessId].title ||
            "Error while loading."
          }
        </div>
      </div>`;
  }

  async renderAllColumns() {
    this.witnessContainer.innerHTML = "";
    for (const col of this.state.getAllColumns()) {
      this.witnessContainer.innerHTML += this.createColumnHTML(
        col.id,
        col.witnessId
      );
    }
    for (const col of this.state.getAllColumns()) {
      await this.renderColumn(col.id);
    }
    this.applyScrollSettings();
    this.applyVisibilitySettings();
  }

  async renderColumn(columnId) {
    const col = this.state.getColumn(columnId);
    if (!col) return;
    const snippet = await this.getSnippet(col.witnessId);
    this.updateColumnContent(col.id, snippet);
    this.applyScrollSettings(columnId);
    this.applyVisibilitySettings(columnId);
  }

  addColumnContainer(witnessId) {
    const columnId = this.state.addColumn(witnessId);
    const columnHTML = this.createColumnHTML(columnId, witnessId);
    this.witnessContainer.insertAdjacentHTML("beforeend", columnHTML);
    return columnId;
  }

  async addColumn(witnessId) {
    const columnId = this.addColumnContainer(witnessId);
    await this.renderColumn(columnId);
  }

  async removeColumn(columnId) {
    this.state.removeColumn(columnId);
    const colElem = document.getElementById(columnId);
    if (colElem) colElem.remove();
  }

  async updateColumnWitness(columnId, witnessId) {
    this.state.updateColumnWitness(columnId, witnessId);
    await this.renderColumn(columnId);
  }

  async addNewColumn() {
    const witnessId =
      this.state.sortedWitnessIds[this.state.columnCount] ||
      this.state.sortedWitnessIds[0];
    await this.addColumn(witnessId);
  }

  // The following methods are unchanged, just use this.state for settings
  toggleScrollingBehaviour() {
    this.state.globalScroll = !this.state.globalScroll;
    this.applyScrollSettings();
  }

  toggleEmptyLinesVisibility() {
    this.state.displayEmptyLines = !this.state.displayEmptyLines;
    this.applyVisibilitySettings();
  }

  toggleGlobalLinecounterVisibility() {
    this.state.displayLinenrGlobal = !this.state.displayLinenrGlobal;
    this.applyVisibilitySettings();
  }

  toggleLocalLinecounterVisibility() {
    this.state.displayLinenrLocal = !this.state.displayLinenrLocal;
    this.applyVisibilitySettings();
  }

  updateColumnContent(columnId, snippet) {
    const columnElement = document.getElementById(columnId);
    if (!columnElement) return;
    const textContentElement = columnElement.querySelector(
      `.${this.config.text_content_class}`
    );
    textContentElement.innerHTML = snippet || "Error while loading...";
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

  handleDoubleClick(event, spanId) {
    document
      .querySelectorAll(
        `.${this.config.text_content_class} span.${this.config.highlight_class}`
      )
      .forEach((span) => {
        span.classList.remove(this.config.highlight_class);
        span.classList.remove(this.config.neigh_class);
      });

    const matchingSpans = document.querySelectorAll(
      `.${this.config.text_content_class} span[id="${spanId}"]`
    );
    let highlitedSpans = [];
    matchingSpans.forEach((matchingSpan) => {
      if (
        !matchingSpan.matches(
          `.${this.config.omitted_line_class}.${this.config.hidden_element_class}`
        )
      ) {
        matchingSpan.classList.add(this.config.highlight_class);
        matchingSpan.scrollIntoView({ behavior: "smooth", block: "center" });
        highlitedSpans.push(matchingSpan);
      } else {
        const previousVisibleSibling =
          this.findPreviousVisibleSibling(matchingSpan);
        if (previousVisibleSibling) {
          previousVisibleSibling.classList.add(this.config.highlight_class);
          previousVisibleSibling.classList.add(this.config.neigh_class);
          previousVisibleSibling.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          highlitedSpans.push(previousVisibleSibling);
        }
      }
    });

    document.addEventListener(
      "click",
      (e) => {
        if (
          !e.target.closest(
            `.${this.config.text_content_class} span[id="${spanId}"]`
          )
        ) {
          highlitedSpans.forEach((highlitedSpan) => {
            highlitedSpan.classList.remove(this.config.highlight_class);
            highlitedSpan.classList.remove(this.config.neigh_class);
          });
        }
      },
      { once: true }
    );
  }

  findPreviousVisibleSibling(element) {
    let sibling = element.previousElementSibling;
    while (sibling) {
      if (
        !sibling.matches(
          `.${this.config.omitted_line_class}.${this.config.hidden_element_class}`
        )
      ) {
        return sibling;
      }
      sibling = sibling.previousElementSibling;
    }
    return null;
  }

  async initColumns() {
    let columnIds = [];
    for (let i = 1; i <= this.config.defaultColumnNumber; i++) {
      const witnessId = this.state.sortedWitnessIds[i - 1];
      if (witnessId) {
        const columnId = this.addColumnContainer(witnessId);
        columnIds.push(columnId);
      }
    }
    await Promise.all(columnIds.map((id) => this.renderColumn(id)));
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

function addButton(containerId, text, onClick) {
  const container = document.getElementById(containerId);
  if (container) {
    const button = document.createElement("button");
    button.textContent = text;
    button.onclick = onClick;
    container.appendChild(button);
  }
}

function createControls(config, manager) {
  addButton(config.columnAdderId, config.label_column_adder, () =>
    manager.addNewColumn()
  );
  addButton(config.scrollTogglerId, config.label_scroll_toggler, () =>
    manager.toggleScrollingBehaviour()
  );
  addButton(config.emptyLineTogglerId, config.label_empty_line_toggler, () =>
    manager.toggleEmptyLinesVisibility()
  );
  addButton(
    config.globalLinenrTogglerId,
    config.label_global_linenr_toggler,
    () => manager.toggleGlobalLinecounterVisibility()
  );
  addButton(
    config.localLinenrTogglerId,
    config.label_local_linenr_toggler,
    () => manager.toggleLocalLinecounterVisibility()
  );

  const toggle = document.querySelector(
    `.${config.class_of_controls_container_toggler}`
  );
  const controls = document.querySelector(
    `.${config.class_of_controls_container}`
  );
  toggle.addEventListener("click", (e) => {
    controls.classList.toggle("open");
    e.stopPropagation();
  });
  document.addEventListener("click", (e) => {
    if (!controls.contains(e.target) && !toggle.contains(e.target)) {
      controls.classList.remove("open");
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
