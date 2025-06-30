const snippetLogPath = "./witness_snippets/snippet_paths.json";
const INDIVIDUAL_SCROLL_CLASS = "individual-scroll-vertical";
const GLOBAL_SCROLL_CLASS = "global-scroll-vertical";
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

document.addEventListener("DOMContentLoaded", () => {
  witnessContainer = document.getElementById("witness-container");
  loadSnippetMetadata()
    .then((metadata) => {
      witness_metadata = metadata;
      sortedWitnessIds = sortWitnesIdsBySorting(metadata);
<<<<<<< HEAD
=======
      console.log(sortedWitnessIds);
>>>>>>> 7c9304bc6236771011878962b2fb7ae024dc23bd
      populateColumns();
      addButton("column-adder", "Add Column", addNewColumn);
      addButton("scroll-toggler", "Toggle Scrolling", toggleScrollingBehaviour);
      addButton(
        "empty-line-toggler",
        "Toggle Empty Line Visibility",
        toggleEmptyLinesVisibility
      );
      addButton(
        "global-linenr-toggler",
        "Toggle Global Line Counter",
        toggleGlobalLinecounterVisibility
      );
      addButton(
        "local-linenr-toggler",
        "Toggle Individual Line Counter",
        toggleLocalLinecounterVisibility
      );
    })
    .catch((error) => console.error("Failed to load snippet metadata:", error));
});

function sortWitnesIdsBySorting(metadata) {
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
    const response = await fetch(snippetLogPath);
    return await response.json();
  } catch (error) {
    console.error(
      `Error loading snippet metadata from ${snippetLogPath}:`,
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
  console.log(currentWitnessId);
  console.log(sortedWitnessIds);
  console.log(witness_metadata);
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
    global_scroll === true ? GLOBAL_SCROLL_CLASS : INDIVIDUAL_SCROLL_CLASS;
  return `
        <div id="${columnId}" class="witness ${cssClass}">
            <div class="controls-container">
                ${generateDropdown(columnId, witnessId)}
                <button class="remove-column-button" onclick="removeColumn('${columnId}')" title="Remove Column">&times;</button>
            </div>
            <div class="text-content ${cssClass}">${
    witness_metadata[witnessId].title || "Error while loading."
  }</div>
        </div>`;
}

function populateColumns(defaultColumnNumber = 4) {
  witnessContainer.innerHTML = "";
  if (!sortedWitnessIds.length) {
    console.error("No labels found in filepathsByLabels.");
    return;
  }
  for (let i = 1; i <= defaultColumnNumber; i++) {
    columnCount++;
    const currentWitnessId = sortedWitnessIds[i - 1];
    if (currentWitnessId) createColumn(witnessContainer, i, currentWitnessId);
  }
}

function createColumn(container, columnIndex, witnessId) {
  const columnId = `witness_column_${String(columnIndex).padStart(2, "0")}`;
  container.innerHTML += createColumnHTML(columnId, witnessId);
  if (!existingColumns.includes(columnId)) existingColumns.push(columnId);
  getSnippet(witnessId, (snippet) => updateColumn(columnId, snippet, null));
}

function updateColumn(columnId, snippet, selectElement = null) {
  const columnElement = document.getElementById(columnId);
  const textContentElement = columnElement.querySelector(".text-content");

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
  const text_contents = document.getElementsByClassName("text-content");
  const witnesses = document.getElementsByClassName("witness");
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
    element.classList.toggle(INDIVIDUAL_SCROLL_CLASS);
    element.classList.toggle(GLOBAL_SCROLL_CLASS);
  }
}

function setEmptyLinesVisibility(textContentElement) {
  textContentElement.querySelectorAll(".witness-line.om").forEach((line) => {
    line.classList.toggle("hidden", !displayEmtyLines);
  });
}

function toggleEmptyLinesVisibility() {
  document
    .querySelectorAll(".witness-line.om")
    .forEach((line) => line.classList.toggle("hidden"));
  displayEmtyLines = !displayEmtyLines;
}

function setGlobalLinecounterVisibility(textContentElement) {
  textContentElement.querySelectorAll(".linenr-global").forEach((line) => {
    line.classList.toggle("hidden", !displayLinenrGlobal);
  });
}

function toggleGlobalLinecounterVisibility() {
  document
    .querySelectorAll(".linenr-global")
    .forEach((line) => line.classList.toggle("hidden"));
  displayLinenrGlobal = !displayLinenrGlobal;
}

function setLocalLinecounterVisibility(textContentElement) {
  textContentElement.querySelectorAll(".linenr_own").forEach((line) => {
    line.classList.toggle("hidden", !displayLinenrLocal);
  });
}

function toggleLocalLinecounterVisibility() {
  document
    .querySelectorAll(".linenr_own")
    .forEach((line) => line.classList.toggle("hidden"));
  displayLinenrLocal = !displayLinenrLocal;
}

function handleDoubleClick(event, spanId) {
  // Remove existing highlights
  document.querySelectorAll(".text-content span.highlight").forEach((span) => {
    span.classList.remove("highlight");
    span.classList.remove("neigh");
  });

  // Highlight all spans with the same ID
  const matchingSpans = document.querySelectorAll(
    `.text-content span[id="${spanId}"]`
  );
  let highlitedSpans = [];
  matchingSpans.forEach((matchingSpan) => {
    if (!matchingSpan.matches(".om.hidden")) {
      matchingSpan.classList.add("highlight");
      // Scroll the span into view if it's visible
      matchingSpan.scrollIntoView({ behavior: "smooth", block: "center" });
      highlitedSpans.push(matchingSpan);
    } else {
      // Find the next visible sibling and scroll to it
      const previousVisibleSibling = findPreviousVisibleSibling(matchingSpan);
      if (previousVisibleSibling) {
        previousVisibleSibling.classList.add("highlight");
        previousVisibleSibling.classList.add("neigh");
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
      if (!e.target.closest(`.text-content span[id="${spanId}"]`)) {
        highlitedSpans.forEach((highlitedSpan) => {
          highlitedSpan.classList.remove("highlight");
          highlitedSpan.classList.remove("neigh");
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
    if (!sibling.matches(".om.hidden")) {
      return sibling;
    }
    sibling = sibling.previousElementSibling;
  }
  return null;
}
