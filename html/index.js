document.addEventListener("DOMContentLoaded", async () => {
    const main = document.querySelector("main");
    const libraryContainer = document.getElementById('library-nav');
    const sortContainer = document.getElementById('sort-options');

    // Fetch data from the local JSON file
    const fetchData = async () => {
        const response = await fetch("/data/library.json");
        return await response.json();
    };

    let data = await fetchData();
    let currentSort = { field: "title", order: "asc" };
    let selectedLibrary = data[0]?.sectionId || null;

    // Render libraries and sort options
    const renderLibraries = () => {
        const header = document.querySelector("header");
        libraryContainer.innerHTML = `
          ${data.map(library =>
            `<a href="#" 
                data-section-id="${library.sectionId}" 
                class="${selectedLibrary == library.sectionId ? "selected" : ""}
                ">${library.sectionTitle} (${library.items.length})</a>`
        ).join(" ○ ")}`;
    };

    const renderSortOptions = () => {
        sortContainer.innerHTML = `
        Sorting by ${currentSort.field}, ${currentSort.order === "asc" ? "ascending" : "descending"}. 
        Sort instead by:
        Title <span class="sort" data-field="title" data-order="asc">⬆️</span>
        <span class="sort" data-field="title" data-order="desc">⬇️</span>
        // Year <span class="sort" data-field="year" data-order="asc">⬆️</span>
        <span class="sort" data-field="year" data-order="desc">⬇️</span>
      `;
    };

    const renderGallery = () => {
        const library = data.find(lib => lib.sectionId == selectedLibrary);
        if (!library) return;

        const sortedItems = [...library.items].sort((a, b) => {
            if (currentSort.order === "asc") {
                return a[currentSort.field] > b[currentSort.field] ? 1 : -1;
            } else {
                return a[currentSort.field] < b[currentSort.field] ? 1 : -1;
            }
        });

        const gallery = document.getElementById('media-list');
        gallery.className = "gallery";
        gallery.innerHTML = sortedItems.map(item => `
            <div class="media-item">
                <img src="${item.image200}" alt="${item.title}" />
                <h2>${item.title}</h2>
                <p>(${item.year})</p>
            </div>
        `
        ).join("");

        main.appendChild(gallery);
    };

    // Event listeners
    document.querySelector("header").addEventListener("click", e => {
        if (e.target.tagName === "A") {
            selectedLibrary = e.target.dataset.sectionId;
            renderLibraries();
            renderGallery();
        }
    });

    sortContainer.addEventListener("click", e => {
        if (e.target.classList.contains("sort")) {
            currentSort.field = e.target.dataset.field;
            currentSort.order = e.target.dataset.order;
            renderSortOptions();
            renderGallery();
        }
    });

    // Initial render
    renderLibraries();
    renderSortOptions();
    renderGallery();
});
