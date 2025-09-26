const resource = window.GetParentResourceName ? window.GetParentResourceName() : 'qb-apartments';

const uiEl = document.getElementById('ui');
const leftListEl = document.getElementById('leftList');
const searchInput = document.getElementById('search');
const clearSearchBtn = document.getElementById('clearSearch');
const modeButtons = document.querySelectorAll('.mode-toggle button');
const categoryDropdown = document.getElementById('categoryDropdown');
const categoryDropdownButton = document.getElementById('categoryDropdownButton');
const categoryDropdownMenu = document.getElementById('categoryDropdownMenu');

const state = {
    visible: false,
    categories: [],
    selectedCategory: null,
    owned: [],
    mode: 'edit',
    search: '',
    settings: {
        snapMove: 0,
        snapRot: 0,
        camSpeed: 0,
    },
    placementInfo: null,
    controlsVisible: false,
    controlKeys: [],
    freeMode: false,
};

function post(action, data = {}) {
    return fetch(`https://${resource}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(data),
    });
}

function getItemIcon(item) {
    // Determine icon based on item type or category
    const category = item.category?.toLowerCase() || '';
    const label = item.label?.toLowerCase() || '';
    const type = item.type?.toLowerCase() || '';
    
    if (category.includes('laundry') || label.includes('laundry') || label.includes('washing')) {
        return { icon: '👕', color: 'green' };
    } else if (category.includes('prop') || type.includes('prop') || label.includes('prop')) {
        return { icon: '📦', color: 'orange' };
    } else if (category.includes('tools') || label.includes('tools') || label.includes('garage')) {
        return { icon: '🔧', color: 'green' };
    } else if (category.includes('guitar') || label.includes('guitar') || label.includes('acoustic')) {
        return { icon: '🎸', color: 'green' };
    } else if (category.includes('collectibles') || label.includes('collectibles')) {
        return { icon: '💎', color: 'green' };
    } else {
        return { icon: '📦', color: 'orange' };
    }
}

function getCategoryIcon(categoryName) {
    const name = categoryName?.toLowerCase() || '';
    
    if (name.includes('laundry') || name.includes('washing')) {
        return '👕';
    } else if (name.includes('prop') || name.includes('props')) {
        return '📦';
    } else if (name.includes('tools') || name.includes('garage')) {
        return '🔧';
    } else if (name.includes('guitar') || name.includes('music')) {
        return '🎸';
    } else if (name.includes('collectibles') || name.includes('collection')) {
        return '💎';
    } else if (name.includes('furniture') || name.includes('chair') || name.includes('table')) {
        return '🪑';
    } else if (name.includes('decoration') || name.includes('decor')) {
        return '🎨';
    } else if (name.includes('electronic') || name.includes('tech')) {
        return '📺';
    } else if (name.includes('kitchen') || name.includes('cooking')) {
        return '🍳';
    } else if (name.includes('bathroom') || name.includes('bath')) {
        return '🚿';
    } else if (name.includes('bedroom') || name.includes('bed')) {
        return '🛏️';
    } else if (name.includes('living') || name.includes('sofa')) {
        return '🛋️';
    } else {
        return '📦';
    }
}

function getQuantityForItem(item) {
    // Generate a random quantity between 1-5 for demo purposes
    // In real implementation, this would come from the server
    return Math.floor(Math.random() * 5) + 1;
}

function matchesSearch(entry) {
    const needle = state.search.trim().toLowerCase();
    if (!needle) return true;
    return Object.values(entry).some(value => {
        if (typeof value === 'string') {
            return value.toLowerCase().includes(needle);
        }
        return false;
    });
}

function renderEmpty(message) {
    if (!leftListEl) return;
    leftListEl.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = message;
    leftListEl.appendChild(empty);
}

function ensureSelectedCategory() {
    if (!state.categories.length) {
        state.selectedCategory = null;
        updateCategoryDropdown();
        return;
    }
    if (state.selectedCategory && state.categories.some(cat => cat.name === state.selectedCategory)) {
        updateCategoryDropdown();
        return;
    }
    const first = state.categories[0];
    state.selectedCategory = first ? first.name : null;
    updateCategoryDropdown();
}

function updateCategoryDropdown() {
    if (!categoryDropdownButton || !categoryDropdownMenu) return;
    
    // Update button content
    const selectedCategory = state.categories.find(cat => cat.name === state.selectedCategory);
    const buttonContent = categoryDropdownButton.querySelector('.category-dropdown-content');
    const buttonIcon = buttonContent.querySelector('.category-dropdown-icon');
    const buttonText = buttonContent.querySelector('.category-dropdown-text');
    
    if (selectedCategory) {
        buttonIcon.textContent = getCategoryIcon(selectedCategory.name);
        buttonText.textContent = selectedCategory.label || selectedCategory.name;
    } else {
        buttonIcon.textContent = '📦';
        buttonText.textContent = 'Select Category';
    }
    
    // Update dropdown menu
    categoryDropdownMenu.innerHTML = '';
    
    state.categories.forEach(category => {
        const item = document.createElement('button');
        item.className = 'category-dropdown-item';
        if (category.name === state.selectedCategory) {
            item.classList.add('active');
        }
        
        const icon = document.createElement('div');
        icon.className = 'category-dropdown-icon';
        icon.textContent = getCategoryIcon(category.name);
        
        const text = document.createElement('span');
        text.textContent = category.label || category.name;
        
        item.appendChild(icon);
        item.appendChild(text);
        
        item.addEventListener('click', () => {
            state.selectedCategory = category.name;
            updateCategoryDropdown();
            closeCategoryDropdown();
            renderList();
        });
        
        categoryDropdownMenu.appendChild(item);
    });
}

function toggleCategoryDropdown() {
    if (!categoryDropdown) return;
    categoryDropdown.classList.toggle('open');
}

function closeCategoryDropdown() {
    if (!categoryDropdown) return;
    categoryDropdown.classList.remove('open');
}

function createItemCard(item) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'item-card';

    const iconInfo = getItemIcon(item);
    
    const icon = document.createElement('div');
    icon.className = `item-icon ${iconInfo.color}`;
    icon.textContent = iconInfo.icon;
    card.appendChild(icon);

    const content = document.createElement('div');
    content.className = 'item-content';
    
    const label = document.createElement('div');
    label.className = 'item-label';
    label.textContent = item.label;
    content.appendChild(label);

    if (item.description || item.object) {
        const description = document.createElement('div');
        description.className = 'item-description';
        description.textContent = item.description || item.object;
        content.appendChild(description);
    }
    
    card.appendChild(content);

    const quantity = document.createElement('div');
    quantity.className = 'item-quantity';
    quantity.textContent = getQuantityForItem(item);
    card.appendChild(quantity);

    card.addEventListener('click', () => {
        post('decorator/startPlacement', {
            label: item.label,
            object: item.object,
            description: item.description || '',
            category: state.selectedCategory,
            type: item.type || null,
            typeLabel: item.typeLabel || null,
        });
    });

    return card;
}

function renderEditList() {
    if (!leftListEl) return;

    // Get all items from all categories
    const allItems = [];
    state.categories.forEach(category => {
        if (category.items) {
            category.items.forEach(item => {
                allItems.push({
                    ...item,
                    category: category.name
                });
            });
        }
    });

    const filteredItems = allItems.filter(item => matchesSearch({
        label: item.label,
        description: item.description || '',
        object: item.object,
        type: item.type || '',
        typeLabel: item.typeLabel || '',
        category: item.category || '',
    }));

    leftListEl.innerHTML = '';

    if (!filteredItems.length) {
        renderEmpty('No decorations match your search');
        return;
    }

    const itemsWrap = document.createElement('div');
    itemsWrap.className = 'decor-items';
    
    filteredItems.forEach(item => {
        itemsWrap.appendChild(createItemCard(item));
    });
    
    leftListEl.appendChild(itemsWrap);
}

function renderPlacedList() {
    if (!leftListEl) return;

    const filteredOwned = state.owned.filter(entry => matchesSearch({
        label: entry.label,
        object: entry.object,
    }));

    leftListEl.innerHTML = '';

    if (!filteredOwned.length) {
        renderEmpty('No decorations placed yet');
        return;
    }

    const list = document.createElement('div');
    list.className = 'owned-list';

    filteredOwned.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'owned-card';

        const iconInfo = getItemIcon(entry);
        
        const icon = document.createElement('div');
        icon.className = `item-icon ${iconInfo.color}`;
        icon.textContent = iconInfo.icon;
        card.appendChild(icon);

        const info = document.createElement('div');
        info.className = 'owned-info';
        
        const name = document.createElement('strong');
        name.textContent = entry.label;
        
        const objectId = document.createElement('div');
        objectId.className = 'item-description';
        objectId.textContent = entry.object;
        
        info.appendChild(name);
        info.appendChild(objectId);
        card.appendChild(info);

        const actions = document.createElement('div');
        actions.className = 'owned-actions';

        const moveBtn = document.createElement('button');
        moveBtn.className = 'move';
        moveBtn.textContent = 'Move';
        moveBtn.addEventListener('click', () => {
            post('decorator/ownedAction', { id: entry.id, action: 'move' });
        });

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
            post('decorator/ownedAction', { id: entry.id, action: 'remove' });
        });

        actions.appendChild(moveBtn);
        actions.appendChild(removeBtn);
        card.appendChild(actions);
        list.appendChild(card);
    });

    leftListEl.appendChild(list);
}

function renderList() {
    if (!leftListEl) return;
    if (state.mode === 'placed') {
        renderPlacedList();
    } else {
        renderEditList();
    }
}

function setCategories(categories) {
    state.categories = categories || [];
    ensureSelectedCategory();
    if (state.mode === 'edit') {
        renderList();
    }
}

function setOwned(list) {
    state.owned = list || [];
    if (state.mode === 'placed') {
        renderPlacedList();
    }
}

function activateModeButton() {
    modeButtons.forEach(btn => {
        const mode = btn.dataset.mode;
        btn.classList.toggle('active', mode === state.mode);
    });
}

function setMode(mode) {
    if (mode !== 'edit' && mode !== 'placed') return;
    state.mode = mode;
    activateModeButton();
    renderList();
}

function clearSearch() {
    state.search = '';
    if (searchInput) {
        searchInput.value = '';
    }
    renderList();
}

function showUI(data) {
    state.visible = true;
    state.mode = 'edit';
    activateModeButton();
    if (uiEl) {
        uiEl.classList.remove('hidden');
    }
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    state.search = '';
    if (data && data.categories) {
        setCategories(data.categories);
    }
    if (data && data.owned) {
        setOwned(data.owned);
    }
    renderList();
}

function hideUI() {
    state.visible = false;
    if (uiEl) {
        uiEl.classList.add('hidden');
    }
    state.search = '';
    state.mode = 'edit';
    activateModeButton();
    if (searchInput) {
        searchInput.value = '';
    }
}

// Event Listeners
if (searchInput) {
    searchInput.addEventListener('input', event => {
        state.search = event.target.value || '';
        renderList();
    });
}

if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', clearSearch);
}

if (categoryDropdownButton) {
    categoryDropdownButton.addEventListener('click', toggleCategoryDropdown);
}

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
    if (categoryDropdown && !categoryDropdown.contains(event.target)) {
        closeCategoryDropdown();
    }
});

modeButtons.forEach(button => {
    button.addEventListener('click', () => {
        setMode(button.dataset.mode);
    });
});

window.addEventListener('message', event => {
    const data = event.data || {};
    switch (data.action) {
        case 'openCatalog':
            showUI({
                categories: data.categories || [],
                owned: data.owned || [],
                settings: data.settings || null,
            });
            break;
        case 'closeCatalog':
            hideUI();
            break;
        case 'updateOwned':
            setOwned(data.owned || []);
            break;
        case 'focusSearch':
            if (searchInput) {
                searchInput.focus();
            }
            break;
        case 'focus':
            if (data.value && searchInput) {
                searchInput.focus();
            }
            break;
    }
});

document.addEventListener('keyup', event => {
    if (event.key === 'Escape') {
        if (state.visible) {
            post('decorator/closeUI');
            hideUI();
        }
    }
});

window.addEventListener('focus', () => {
    if (state.visible && searchInput) {
        searchInput.focus();
    }
});

window.addEventListener('DOMContentLoaded', () => {
    activateModeButton();
});