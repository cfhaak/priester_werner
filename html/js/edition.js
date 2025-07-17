import ColumnViewerConfig from "./column_viewer_config.js";

class EditionState {
  constructor(config, witness_metadata, sortedWitnessIds) {
    this.config = config;
    this.witness_metadata = witness_metadata;
    this.sortedWitnessIds = sortedWitnessIds;
    this.snippetsByLabels = {};
    this.columns = []; // [{id, witnessId}]
    this.globalScroll = false;
    this.displayEmptyLines = true;
    this.displayLinenrGlobal = true;
    this.displayLinenrLocal = false;
    this.witnessContainer = document.getElementById(config.witnessContainerId);
    this.columnCount = 0;
    this.initListeners();
  }

  initListeners() {
    this.witnessContainer.addEventListener("click", (event) => {
      if (event.target.matches(`.${this.config.remove_column_button_class}`)) {
        const columnId = event.target.closest(`.${this.config.witness_class}`).id;
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
    if (this.snippetsByLabels[witnessId]) {
      return this.snippetsByLabels[witnessId];
    }
    try {
      const response = await fetch(this.witness_metadata[witnessId].filepath);
      if (!response.ok) {
        return `Resource '${this.witness_metadata[witnessId].filepath}' couldn't be loaded.`;
      }
      const htmlText = await response.text();
      const snippet = new DOMParser().parseFromString(htmlText, "text/html").body.innerHTML;
      this.snippetsByLabels[witnessId] = snippet;
      return snippet;
    } catch (error) {
      return `Resource '${this.witness_metadata[witnessId].filepath}' couldn't be loaded. ${error.message}`;
    }
  }

  generateDropdown(columnId, currentWitnessId) {
    return `
      <select class="${this.config.dropdown_class}" data-column-id="${columnId}">
        ${this.sortedWitnessIds
          .map(
            (witnessId) =>
              `<option value="${witnessId}" ${
                witnessId === currentWitnessId ? "selected" : ""
              }>${this.witness_metadata[witnessId].title}</option>`
          )
          .join("")}
      </select>`;
  }

  createColumnHTML(columnId, witnessId) {
    const cssClass = this.globalScroll
      ? this.config.GLOBAL_SCROLL_CLASS
      : this.config.INDIVIDUAL_SCROLL_CLASS;
    return `
      <div id="${columnId}" class="${this.config.witness_class} ${cssClass}">
        <div class="${this.config.controls_container_class}">
          ${this.generateDropdown(columnId, witnessId)}
          <button class="${this.config.remove_column_button_class}" title="Remove Column">&times;</button>
        </div>
        <div class="${this.config.text_content_class} ${cssClass}">
          ${this.witness_metadata[witnessId].title || "Error while loading."}
        </div>
      </div>`;
  }

  async renderAllColumns() {
    this.witnessContainer.innerHTML = "";
    for (const col of this.columns) {
      this.witnessContainer.innerHTML += this.createColumnHTML(col.id, col.witnessId);
    }
    for (const col of this.columns) {
      await this.renderColumn(col.id);
    }
    this.applyGlobalSettings();
  }

  async renderColumn(columnId) {
    const col = this.columns.find(c => c.id === columnId);
    if (!col) return;
    const snippet = await this.getSnippet(col.witnessId);
    this.updateColumnContent(col.id, snippet);
  }

  async addColumn(witnessId) {
    this.columnCount++;
    const columnId = `Witness_column_${String(this.columnCount).padStart(2, "0")}`;
    this.columns.push({ id: columnId, witnessId });
    const columnHTML = this.createColumnHTML(columnId, witnessId);
    this.witnessContainer.insertAdjacentHTML('beforeend', columnHTML);
    await this.renderColumn(columnId);
    this.applyGlobalSettings(columnId); // Only update the new column
  }

  async removeColumn(columnId) {
    this.columns = this.columns.filter(col => col.id !== columnId);
    await this.renderAllColumns();
  }

  async updateColumnWitness(columnId, witnessId) {
    const col = this.columns.find(col => col.id === columnId);
    if (col) {
      col.witnessId = witnessId;
      await this.renderColumn(columnId);
    }
  }

  async addNewColumn() {
    const witnessId = this.sortedWitnessIds[this.columnCount] || this.sortedWitnessIds[0];
    await this.addColumn(witnessId);
  }

  toggleScrollingBehaviour() {
    this.globalScroll = !this.globalScroll;
    this.renderAllColumns();
  }

  toggleEmptyLinesVisibility() {
    this.displayEmptyLines = !this.displayEmptyLines;
    this.renderAllColumns();
  }

  toggleGlobalLinecounterVisibility() {
    this.displayLinenrGlobal = !this.displayLinenrGlobal;
    this.renderAllColumns();
  }

  toggleLocalLinecounterVisibility() {
    this.displayLinenrLocal = !this.displayLinenrLocal;
    this.renderAllColumns();
  }

  updateColumnContent(columnId, snippet) {
    const columnElement = document.getElementById(columnId);
    if (!columnElement) return;
    const textContentElement = columnElement.querySelector(`.${this.config.text_content_class}`);
    textContentElement.innerHTML = snippet || "Error while loading...";
    this.setEmptyLinesVisibility(textContentElement);
    this.setGlobalLinecounterVisibility(textContentElement);
    this.setLocalLinecounterVisibility(textContentElement);
  }

  setEmptyLinesVisibility(textContentElement) {
    textContentElement
      .querySelectorAll(
        `.${this.config.witness_line_class}.${this.config.omitted_line_class}`
      )
      .forEach((line) => {
        line.classList.toggle(this.config.hidden_element_class, !this.displayEmptyLines);
      });
  }

  setGlobalLinecounterVisibility(textContentElement) {
    textContentElement
      .querySelectorAll(`.${this.config.global_line_counter_class}`)
      .forEach((line) => {
        line.classList.toggle(this.config.hidden_element_class, !this.displayLinenrGlobal);
      });
  }

  setLocalLinecounterVisibility(textContentElement) {
    textContentElement
      .querySelectorAll(`.${this.config.local_line_counter_class}`)
      .forEach((line) => {
        line.classList.toggle(this.config.hidden_element_class, !this.displayLinenrLocal);
      });
  }

  applyGlobalSettings(columnId = null) {
    if (columnId) {
      // Only update the specified column
      const columnElement = document.getElementById(columnId);
      if (columnElement) {
        const textContent = columnElement.querySelector(`.${this.config.text_content_class}`);
        this.toggleScrollClass(textContent, this.globalScroll);
        this.toggleScrollClass(columnElement, this.globalScroll);
      }
    } else {
      // Update all columns
      const text_contents = this.witnessContainer.getElementsByClassName(this.config.text_content_class);
      const witnesses = this.witnessContainer.getElementsByClassName(this.config.witness_class);
      for (const text_content of text_contents) {
        this.toggleScrollClass(text_content, this.globalScroll);
      }
      for (const witness of witnesses) {
        this.toggleScrollClass(witness, this.globalScroll);
      }
    }
  }

  toggleScrollClass(element, globalScroll) {
    if (element) {
      element.classList.toggle(this.config.INDIVIDUAL_SCROLL_CLASS, !globalScroll);
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
        const previousVisibleSibling = this.findPreviousVisibleSibling(matchingSpan);
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
          !e.target.closest(`.${this.config.text_content_class} span[id="${spanId}"]`)
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
}

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
    return await response.json();
  } catch (error) {
    return {};
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const config = await loadConfig();
  const witness_metadata = await loadSnippetMetadata(config);
  const sortedWitnessIds = sortWitnessIdsBySorting(witness_metadata);
  const editionState = new EditionState(config, witness_metadata, sortedWitnessIds);

  // Initial columns
  for (let i = 1; i <= config.defaultColumnNumber; i++) {
    const witnessId = sortedWitnessIds[i - 1];
    console.log(`Adding initial column for witnessId: ${witnessId}`);
    if (witnessId) await editionState.addColumn(witnessId);
  }

  // Control buttons
  addButton(config.columnAdderId, "Add Column", () => editionState.addNewColumn());
  addButton(config.scrollTogglerId, "Toggle Scrolling", () => editionState.toggleScrollingBehaviour());
  addButton(config.emptyLineTogglerId, "Toggle Empty Line Visibility", () => editionState.toggleEmptyLinesVisibility());
  addButton(config.globalLinenrTogglerId, "Toggle Global Line Counter", () => editionState.toggleGlobalLinecounterVisibility());
  addButton(config.localLinenrTogglerId, "Toggle Individual Line Counter", () => editionState.toggleLocalLinecounterVisibility());

  // Controls container toggle
  const toggle = document.querySelector('.witness_view_controls_toggle');
  const controls = document.querySelector('.witness_view_controls');
  toggle.addEventListener('click', (e) => {
    controls.classList.toggle('open');
    e.stopPropagation();
  });
  document.addEventListener('click', (e) => {
    if (!controls.contains(e.target) && !toggle.contains(e.target)) {
      controls.classList.remove('open');
    }
  });
});

function addButton(containerId, text, onClick) {
  const container = document.getElementById(containerId);
  if (container) {
    const button = document.createElement("button");
    button.textContent = text;
    button.onclick = onClick;
    container.appendChild(button);
  }
}