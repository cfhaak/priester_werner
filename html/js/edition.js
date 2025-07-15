import ColumnViewerConfig from './column_viewer_config.js';
let default_global_scroll = false;
let global_scroll = default_global_scroll;
let existingColumns = [];
let snippetsByLabels = [];
let witness_metadata = [];
let sortedWitnessIds = [];
let witness_by_id = [];
let columnCount = 0;
let witnessContainer;
let displayEmtyLines = true;
let displayLinenrGlobal = true;
let displayLinenrLocal = false;
let config = {};

async function loadConfig() {
  config = new ColumnViewerConfig();
}


// Usage: Call loadConfig() before anything else in your DOMContentLoaded handler
document.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  witnessContainer = document.getElementById(config.witnessContainerId);
  loadSnippetMetadata()
    .then((metadata) => {
      witness_metadata = metadata;
      sortedWitnessIds = sortWitnessIdsBySorting(metadata);
      populateColumns();
      addButton(config.columnAdderId, "Add Column", addNewColumn);
      addButton(config.scrollTogglerId, "Toggle Scrolling", toggleScrollingBehaviour);
      addButton(
        config.emptyLineTogglerId,
        "Toggle Empty Line Visibility",
        toggleEmptyLinesVisibility
      );
      addButton(
        config.globalLinenrTogglerId,
        "Toggle Global Line Counter",
        toggleGlobalLinecounterVisibility
      );
      addButton(
        config.localLinenrTogglerId,
        "Toggle Individual Line Counter",
        toggleLocalLinecounterVisibility
      );
    })
    .catch((error) => console.error("Failed to load snippet metadata:", error));
});

function sortWitnessIdsBySorting(metadata) {
  return Object.entries(metadata)
    .sort((a, b) => a[1].sorting.localeCompare(b[1].sorting))
    .map(([key]) => key);
}

async function fetchSnippet(filename) {
  try {
    const response = await fetch(filename);
    const htmlText = await response.text();
    return new DOMParser().parseFromString(htmlText, "text/html").body
      .innerHTML;
  } catch (error) {
    console.error(`Error fetching snippet from ${filename}:`, error);
    return "";
  }
}

async function loadSnippetMetadata() {
  try {
    const response = await fetch(config.snippetLogPath);
    return await response.json();
  } catch (error) {
    console.error(
      `Error loading snippet metadata from ${config.snippetLogPath}:`,
      error
    );
    return {};
  }
}

function getSnippet(witnessId, callback) {
  if (snippetsByLabels[witnessId]) {
    callback(snippetsByLabels[witnessId]);
  } else {
    fetchSnippet(witness_metadata[witnessId].filepath)
      .then((snippet) => {
        snippetsByLabels[witnessId] = snippet;
        callback(snippet);
      })
      .catch((error) => {
        console.error(`Error getting snippet for UID ${uid}:`, error);
        callback("");
      });
  }
}

function generateDropdown(columnId, currentWitnessId) {
  return `
        <select class="text-select" onchange="updateColumn('${columnId}', null, this)">
            ${sortedWitnessIds
              .map(
                (witnessId) =>
                  `<option value="${witnessId}" ${
                    witnessId === currentWitnessId ? "selected" : ""
                  }>${witness_metadata[witnessId].title}</option>`
              )
              .join("")}
        </select>`;
}

function removeColumn(columnId) {
  const columnElement = document.getElementById(columnId);
  if (columnElement) {
    columnElement.remove();
    existingColumns = existingColumns.filter((id) => id !== columnId);
  }
}

function createColumnHTML(columnId, witnessId) {
  const cssClass =
    global_scroll === true ? config.GLOBAL_SCROLL_CLASS : config.INDIVIDUAL_SCROLL_CLASS;
  return `
        <div id="${columnId}" class="${config.witness_class} ${cssClass}">
            <div class="${config.controls_container_class}">
                ${generateDropdown(columnId, witnessId)}
                <button class="${config.remove_column_button_class}" onclick="removeColumn('${columnId}')" title="Remove Column">&times;</button>
            </div>
            <div class="${config.text_content_class} ${cssClass}">${
    witness_metadata[witnessId].title || "Error while loading."
  }</div>
        </div>`;
}

function populateColumns() {
  witnessContainer.innerHTML = "";
  if (!sortedWitnessIds.length) {
    console.error("No labels found in filepathsByLabels.");
    return;
  }
  for (let i = 1; i <= config.defaultColumnNumber; i++) {
    columnCount++;
    const currentWitnessId = sortedWitnessIds[i - 1];
    if (currentWitnessId) createColumn(witnessContainer, i, currentWitnessId);
  }
}

function createColumn(container, columnIndex, witnessId) {
  const columnId = `Witness_column_${String(columnIndex).padStart(2, "0")}`;
  container.innerHTML += createColumnHTML(columnId, witnessId);
  if (!existingColumns.includes(columnId)) existingColumns.push(columnId);
  getSnippet(witnessId, (snippet) => updateColumn(columnId, snippet, null));
}

function updateColumn(columnId, snippet, selectElement = null) {
  const columnElement = document.getElementById(columnId);
  const textContentElement = columnElement.querySelector(`.${config.text_content_class}`);

  // If a selectElement is provided, fetch the snippet
  if (selectElement) {
    getSnippet(selectElement.value, (fetchedSnippet) => {
      textContentElement.innerHTML = fetchedSnippet || "Loading...";
      setEmptyLinesVisibility(textContentElement);
      setGlobalLinecounterVisibility(textContentElement);
      setLocalLinecounterVisibility(textContentElement);
    });
  } else {
    // Otherwise, use the provided snippet
    textContentElement.innerHTML = snippet || "Error while loading...";
    setEmptyLinesVisibility(textContentElement);
    setGlobalLinecounterVisibility(textContentElement);
    setLocalLinecounterVisibility(textContentElement);
  }
}

function addNewColumn() {
  columnCount++;
  const labelKeys = Object.keys(witness_metadata).sort();
  const defaultKey = labelKeys[columnCount - 1] || labelKeys[0];
  createColumn(witnessContainer, columnCount, defaultKey);
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

function toggleScrollingBehaviour() {
  const text_contents = document.getElementsByClassName(config.text_content_class);
  const witnesses = document.getElementsByClassName(config.witness_class);
  for (const text_content of text_contents) {
    toggleScrollClass(text_content);
  }
  for (const witness of witnesses) {
    toggleScrollClass(witness);
  }
  global_scroll = !global_scroll;
}

function toggleScrollClass(element) {
  if (element) {
    element.classList.toggle(config.INDIVIDUAL_SCROLL_CLASS);
    element.classList.toggle(config.GLOBAL_SCROLL_CLASS);
  }
}

function setEmptyLinesVisibility(textContentElement) {
  textContentElement.querySelectorAll(`.${config.witness_line_class}.${config.omitted_line_class}`).forEach((line) => {
    line.classList.toggle(config.hidden_element_class, !displayEmtyLines);
  });
}

function toggleEmptyLinesVisibility() {
  document
    .querySelectorAll(`.${config.witness_line_class}.${config.omitted_line_class}`)
    .forEach((line) => line.classList.toggle(config.hidden_element_class));
  displayEmtyLines = !displayEmtyLines;
}

function setGlobalLinecounterVisibility(textContentElement) {
  textContentElement.querySelectorAll(`.${config.global_line_counter_class}`).forEach((line) => {
    line.classList.toggle(config.hidden_element_class, !displayLinenrGlobal);
  });
}

function toggleGlobalLinecounterVisibility() {
  document
    .querySelectorAll(`.${config.global_line_counter_class}`)
    .forEach((line) => line.classList.toggle(config.hidden_element_class));
  displayLinenrGlobal = !displayLinenrGlobal;
}

function setLocalLinecounterVisibility(textContentElement) {
  textContentElement.querySelectorAll(`.${config.local_line_counter_class}`).forEach((line) => {
    line.classList.toggle(config.hidden_element_class, !displayLinenrLocal);
  });
}

function toggleLocalLinecounterVisibility() {
  document
    .querySelectorAll(`.${config.local_line_counter_class}`)
    .forEach((line) => line.classList.toggle(config.hidden_element_class));
  displayLinenrLocal = !displayLinenrLocal;
}

function handleDoubleClick(event, spanId) {
  // Remove existing highlights
  document.querySelectorAll(`.${config.text_content_class} span.${config.highlight_class}`).forEach((span) => {
    span.classList.remove(config.highlight_class);
    span.classList.remove(config.neigh_class);
  });

  // Highlight all spans with the same ID
  const matchingSpans = document.querySelectorAll(
    `.${config.text_content_class} span[id="${spanId}"]`
  );
  let highlitedSpans = [];
  matchingSpans.forEach((matchingSpan) => {
    if (!matchingSpan.matches(`.${config.omitted_line_class}.${config.hidden_element_class}`)) {
      matchingSpan.classList.add(config.highlight_class);
      // Scroll the span into view if it's visible
      matchingSpan.scrollIntoView({ behavior: "smooth", block: "center" });
      highlitedSpans.push(matchingSpan);
    } else {
      // Find the next visible sibling and scroll to it
      const previousVisibleSibling = findPreviousVisibleSibling(matchingSpan);
      if (previousVisibleSibling) {
        previousVisibleSibling.classList.add(config.highlight_class);
        previousVisibleSibling.classList.add(config.neigh_class);
        previousVisibleSibling.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        highlitedSpans.push(previousVisibleSibling);
      }
    }
  });

  // Add a one-time click listener to remove highlights when clicking elsewhere
  document.addEventListener(
    "click",
    (e) => {
      // Check if the click is outside the highlighted spans
      if (!e.target.closest(`.${config.text_content_class} span[id="${spanId}"]`)) {
        highlitedSpans.forEach((highlitedSpan) => {
          highlitedSpan.classList.remove(config.highlight_class);
          highlitedSpan.classList.remove(config.neigh_class);
        });
      }
    },
    { once: true }
  );
}

// Helper function to find the next visible sibling
function findPreviousVisibleSibling(element) {
  let sibling = element.previousElementSibling;
  while (sibling) {
    if (!sibling.matches(`.${config.omitted_line_class}.${config.hidden_element_class}`)) {
      return sibling;
    }
    sibling = sibling.previousElementSibling;
  }
  return null;
}
