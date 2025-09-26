const resource = window.GetParentResourceName ? window.GetParentResourceName() : 'qb-apartments';

const uiEl = document.getElementById('ui');
const controlsBar = document.getElementById('controlsBar');
const leftListEl = document.getElementById('leftList');
const searchInput = document.getElementById('search');
const clearSearchBtn = document.getElementById('clearSearch');
const modeButtons = document.querySelectorAll('.mode-toggle button');
const tabButtons = document.querySelectorAll('.tabs .tab');
const actionButtons = document.querySelectorAll('.action-buttons button');

const snapMoveInput = document.getElementById('snapMove');
const snapRotInput = document.getElementById('snapRot');
const camSpeedInput = document.getElementById('camSpeed');
const snapMoveValue = document.getElementById('snapMoveValue');
const snapRotValue = document.getElementById('snapRotValue');
const camSpeedValue = document.getElementById('camSpeedValue');

const infoHash = document.getElementById('infoHash');
const infoLabel = document.getElementById('infoLabel');
const infoMaterial = document.getElementById('infoMaterial');
const infoInventory = document.getElementById('infoInventory');
const posX = document.getElementById('posX');
const posY = document.getElementById('posY');
const posZ = document.getElementById('posZ');
const rotX = document.getElementById('rotX');
const rotY = document.getElementById('rotY');
const rotZ = document.getElementById('rotZ');

if (controlsBar) {
    controlsBar.classList.add('controls');
}
if (snapMoveInput) snapMoveInput.dataset.setting = 'snapMove';
if (snapRotInput) snapRotInput.dataset.setting = 'snapRot';
if (camSpeedInput) camSpeedInput.dataset.setting = 'camSpeed';

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

let syncingSettings = false;

function post(action, data = {}) {
    return fetch(`https://${resource}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(data),
    });
}

function formatNumber(value, decimals) {
    return Number.isFinite(value) ? value.toFixed(decimals) : '-';
}

function formatText(value) {
    return value && value !== '' ? value : '-';
}

function ensureSelectedCategory() {
    if (!state.categories.length) {
        state.selectedCategory = null;
        return;
    }
    if (state.selectedCategory && state.categories.some(cat => cat.name === state.selectedCategory)) {
        return;
    }
    const first = state.categories[0];
    state.selectedCategory = first ? first.name : null;
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

function renderCategoryButtons(container) {
    state.categories.forEach(category => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'decor-category' + (category.name === state.selectedCategory ? ' active' : '');
        const title = document.createElement('span');
        title.className = 'title';
        title.textContent = category.label || category.name;
        button.appendChild(title);
        button.addEventListener('click', () => {
            state.selectedCategory = category.name;
            renderList();
        });
        container.appendChild(button);
    });
}

function createItemCard(item) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'item-card';

    if (item.typeLabel || item.type) {
        const badge = document.createElement('span');
        badge.className = 'item-badge';
        badge.textContent = item.typeLabel || item.type;
        card.appendChild(badge);
    }

    const image = document.createElement('img');
    image.src = item.image;
    image.alt = item.label;
    card.appendChild(image);

    const label = document.createElement('div');
    label.className = 'item-label';
    label.textContent = item.label;
    card.appendChild(label);

    if (item.description) {
        const description = document.createElement('div');
        description.className = 'item-description';
        description.textContent = item.description;
        card.appendChild(description);
    }

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
    ensureSelectedCategory();

    if (!state.selectedCategory) {
        renderEmpty('No categories available');
        return;
    }

    const category = state.categories.find(cat => cat.name === state.selectedCategory);
    if (!category) {
        renderEmpty('Category not found');
        return;
    }

    const filteredItems = (category.items || []).filter(item => matchesSearch({
        label: item.label,
        description: item.description || '',
        object: item.object,
        type: item.type || '',
        typeLabel: item.typeLabel || '',
    }));

    leftListEl.innerHTML = '';

    const categoriesWrap = document.createElement('div');
    categoriesWrap.className = 'decor-categories';
    renderCategoryButtons(categoriesWrap);
    leftListEl.appendChild(categoriesWrap);

    if (!filteredItems.length) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No decorations match your search';
        leftListEl.appendChild(empty);
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
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No decorations placed yet';
        leftListEl.appendChild(empty);
        return;
    }

    const list = document.createElement('div');
    list.className = 'owned-list';

    filteredOwned.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'owned-card';

        const image = document.createElement('img');
        image.src = entry.image;
        image.alt = entry.label;
        card.appendChild(image);

        const info = document.createElement('div');
        info.className = 'owned-info';
        const name = document.createElement('strong');
        name.textContent = entry.label;
        const objectId = document.createElement('span');
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

function setActiveTab(tab) {
    tabButtons.forEach(button => {
        button.classList.toggle('active', button === tab);
    });
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
    if (data && data.settings) {
        applySettings(data.settings);
    }
    if (tabButtons.length) {
        setActiveTab(tabButtons[0]);
    }
    renderList();
    updatePlacementInfo(null);
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

function applySettings(settings) {
    if (!settings) return;
    syncingSettings = true;
    if (snapMoveInput && Object.prototype.hasOwnProperty.call(settings, 'snapMove')) {
        const value = Number(settings.snapMove) || 0;
        state.settings.snapMove = value;
        snapMoveInput.value = value;
        if (snapMoveValue) {
            snapMoveValue.textContent = formatNumber(value, 2);
        }
    }
    if (snapRotInput && Object.prototype.hasOwnProperty.call(settings, 'snapRot')) {
        const value = Number(settings.snapRot) || 0;
        state.settings.snapRot = value;
        snapRotInput.value = value;
        if (snapRotValue) {
            snapRotValue.textContent = formatNumber(value, 0);
        }
    }
    if (camSpeedInput && Object.prototype.hasOwnProperty.call(settings, 'camSpeed')) {
        const value = Number(settings.camSpeed) || 0;
        state.settings.camSpeed = value;
        camSpeedInput.value = value;
        if (camSpeedValue) {
            camSpeedValue.textContent = formatNumber(value, 2);
        }
    }
    syncingSettings = false;
}

function handleSettingInput(event) {
    if (syncingSettings) return;
    const input = event.target;
    const key = input.dataset.setting;
    if (!key) return;
    const value = Number(input.value);
    if (!Number.isFinite(value)) return;

    state.settings[key] = value;

    if (key === 'snapMove' && snapMoveValue) {
        snapMoveValue.textContent = formatNumber(value, 2);
    } else if (key === 'snapRot' && snapRotValue) {
        snapRotValue.textContent = formatNumber(value, 0);
    } else if (key === 'camSpeed' && camSpeedValue) {
        camSpeedValue.textContent = formatNumber(value, 2);
    }

    post('decorator/updateSetting', { setting: key, value });
}

function updatePlacementInfo(info) {
    state.placementInfo = info;
    const hasInfo = !!info;

    if (infoHash) infoHash.textContent = hasInfo ? formatText(info.hash || info.object) : '-';
    if (infoLabel) infoLabel.textContent = hasInfo ? formatText(info.label) : '-';
    if (infoMaterial) infoMaterial.textContent = hasInfo ? formatText(info.material) : '-';
    if (infoInventory) infoInventory.textContent = hasInfo ? formatText(info.inventory) : '-';

    const pos = hasInfo && info.position ? info.position : null;
    const rot = hasInfo && info.rotation ? info.rotation : null;

    if (posX) posX.textContent = pos ? formatNumber(pos.x, 2) : '-';
    if (posY) posY.textContent = pos ? formatNumber(pos.y, 2) : '-';
    if (posZ) posZ.textContent = pos ? formatNumber(pos.z, 2) : '-';

    if (rotX) rotX.textContent = rot ? formatNumber(rot.x, 1) : '-';
    if (rotY) rotY.textContent = rot ? formatNumber(rot.y, 1) : '-';
    if (rotZ) rotZ.textContent = rot ? formatNumber(rot.z, 1) : '-';
}

function updateFreeModeLabel() {
    if (!controlsBar) return;
    const toggle = controlsBar.querySelector(".control-key[data-key='mode'] .label");
    if (toggle) {
        toggle.textContent = state.freeMode ? 'Lock Onto Object' : 'Toggle Freecam';
    }
}

function renderControls() {
    if (!controlsBar) return;
    controlsBar.innerHTML = '';

    if (!state.controlsVisible) {
        controlsBar.classList.add('hidden');
        return;
    }

    controlsBar.classList.remove('hidden');

    const fragment = document.createDocumentFragment();

    state.controlKeys.forEach((entry, index) => {
        if (index > 0) {
            const divider = document.createElement('div');
            divider.className = 'divider';
            fragment.appendChild(divider);
        }

        const keyWrap = document.createElement('div');
        keyWrap.className = 'control-key';
        if (entry.id) {
            keyWrap.dataset.key = entry.id;
        } else if (entry.key) {
            keyWrap.dataset.key = entry.key.toLowerCase();
        }

        const key = document.createElement('span');
        key.className = 'key';
        key.textContent = entry.key;

        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = entry.label;

        keyWrap.appendChild(key);
        keyWrap.appendChild(label);
        fragment.appendChild(keyWrap);
    });

    controlsBar.appendChild(fragment);
    updateFreeModeLabel();
}

function setControlsState(visible, keys, freeMode) {
    state.controlsVisible = !!visible;
    state.controlKeys = Array.isArray(keys) ? keys : [];
    if (typeof freeMode === 'boolean') {
        state.freeMode = freeMode;
    }
    // renderControls();
}

if (searchInput) {
    searchInput.addEventListener('input', event => {
        state.search = event.target.value || '';
        renderList();
    });
}

if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', clearSearch);
}

modeButtons.forEach(button => {
    button.addEventListener('click', () => {
        setMode(button.dataset.mode);
    });
});

if (snapMoveInput) snapMoveInput.addEventListener('input', handleSettingInput);
if (snapRotInput) snapRotInput.addEventListener('input', handleSettingInput);
if (camSpeedInput) camSpeedInput.addEventListener('input', handleSettingInput);

actionButtons.forEach(button => {
    button.addEventListener('click', () => {
        const command = button.dataset.command;
        if (command) {
            post('decorator/button', { command });
        }
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
        case 'controls':
            setControlsState(data.visible, data.keys, data.freeMode);
            break;
        case 'focusSearch':
            if (searchInput) {
                searchInput.focus();
            }
            break;
        case 'placementInfo':
            updatePlacementInfo(data.info || null);
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
    // renderControls();
});
