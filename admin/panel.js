document.addEventListener('DOMContentLoaded', () => {
  let menuData = { items: [] };
  let originalMenuData = '';
  const loadingEl = document.getElementById('loading');
  const menuGridEl = document.getElementById('menuGrid');
  const saveChangesBtn = document.getElementById('saveChangesBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const modal = document.getElementById('itemModal');
  const modalTitle = document.getElementById('modalTitle');
  const itemForm = document.getElementById('itemForm');
  const closeModalBtn = document.querySelector('.close-btn');
  const newItemBtn = document.getElementById('newItemBtn');
  const modalItemId = document.getElementById('modalItemId');
  const nameInput = document.getElementById('name');
  const descInput = document.getElementById('desc');
  const priceInput = document.getElementById('price');
  const pricePInput = document.getElementById('priceP');
  const priceMInput = document.getElementById('priceM');
  const priceGInput = document.getElementById('priceG');
  const catInput = document.getElementById('cat');
  const imgInput = document.getElementById('img');
  const imgPreview = document.getElementById('img-preview');
  const activeInput = document.getElementById('active');
  const fmt = n => Number(n).toFixed(2).replace('.', ',');

  async function init() {
    try {
      loadingEl.textContent = 'Carregando cardapio...';
      loadingEl.style.display = 'block';
      menuGridEl.style.display = 'none';
      const response = await fetch('/.netlify/functions/get-menu');
      if (!response.ok) throw new Error('Falha ao carregar o cardapio.');
      menuData = await response.json();
      originalMenuData = JSON.stringify(menuData);
      renderMenu();
    } catch (error) {
      loadingEl.textContent = `Erro: ${error.message}`;
    } finally {
      loadingEl.style.display = 'none';
      menuGridEl.style.display = 'grid';
    }
  }

  function summary(item) {
    if (item.sizes) return `P (8 fatias) ${fmt(item.sizes.P)} | M (12 fatias) ${fmt(item.sizes.M)} | G (16 fatias) ${fmt(item.sizes.G)}`;
    return `R$ ${fmt(item.price || 0)}`;
  }

  function renderMenu() {
    menuGridEl.innerHTML = '';
    if (!menuData.items?.length) {
      menuGridEl.innerHTML = '<p>Nenhum item no cardapio ainda.</p>';
      return;
    }

    menuData.items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'menu-card';
      card.innerHTML = `<img src="${item.img || 'https://via.placeholder.com/300x180.png?text=Sem+Imagem'}" alt="${item.name}"><div class="menu-card-content"><h3>${item.name}</h3><p>${summary(item)}</p><small>Categoria: ${item.cat}</small><br><small>Ativo: ${item.active ? 'Sim' : 'Nao'}</small></div><div class="menu-card-actions"><button class="btn btn-secondary edit-btn" data-id="${item.id}">Editar</button><button class="btn btn-danger delete-btn" data-id="${item.id}">Excluir</button></div>`;
      menuGridEl.appendChild(card);
    });
  }

  saveChangesBtn.addEventListener('click', saveChanges);
  logoutBtn.addEventListener('click', logout);
  newItemBtn.addEventListener('click', () => openModal(null));
  closeModalBtn.addEventListener('click', () => { modal.style.display = 'none'; });
  window.addEventListener('click', event => { if (event.target === modal) modal.style.display = 'none'; });
  menuGridEl.addEventListener('click', event => {
    const target = event.target;
    if (target.classList.contains('edit-btn')) openModal(menuData.items.find(i => i.id === target.dataset.id));
    if (target.classList.contains('delete-btn')) handleDeleteItem(target.dataset.id);
  });
  itemForm.addEventListener('submit', handleFormSubmit);

  function openModal(item) {
    itemForm.reset();
    imgPreview.style.display = 'none';
    if (item) {
      modalTitle.textContent = 'Editar Item';
      modalItemId.value = item.id;
      nameInput.value = item.name;
      descInput.value = item.desc || '';
      priceInput.value = item.price || '';
      pricePInput.value = item.sizes?.P || '';
      priceMInput.value = item.sizes?.M || '';
      priceGInput.value = item.sizes?.G || '';
      catInput.value = item.cat;
      activeInput.checked = item.active;
      if (item.img) {
        imgPreview.src = item.img;
        imgPreview.style.display = 'block';
      }
    } else {
      modalTitle.textContent = 'Novo Item';
      modalItemId.value = '';
    }
    modal.style.display = 'flex';
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    const id = modalItemId.value || `item-${Date.now()}`;
    let imageUrl = imgPreview.src;
    const imageFile = imgInput.files[0];

    if (imageFile) {
      saveChangesBtn.disabled = true;
      saveChangesBtn.textContent = 'Enviando imagem...';
      try {
        const base64Image = await toBase64(imageFile);
        const response = await fetch('/.netlify/functions/upload-image', {
          method: 'POST',
          credentials: 'same-origin',
          body: JSON.stringify({ filename: `${id}-${imageFile.name}`, body: base64Image })
        });
        if (!response.ok) throw new Error('Falha no upload da imagem.');
        const data = await response.json();
        imageUrl = data.url;
      } catch (error) {
        alert(`Erro no upload da imagem: ${error.message}`);
        return;
      } finally {
        saveChangesBtn.disabled = false;
        saveChangesBtn.textContent = 'Salvar Alteracoes';
      }
    }

    const updatedItem = {
      id,
      name: nameInput.value,
      desc: descInput.value,
      cat: catInput.value,
      active: activeInput.checked,
      img: imageUrl
    };

    if (pricePInput.value || priceMInput.value || priceGInput.value) {
      updatedItem.sizes = {
        P: parseFloat(pricePInput.value || 0),
        M: parseFloat(priceMInput.value || 0),
        G: parseFloat(priceGInput.value || 0)
      };
    } else {
      updatedItem.price = parseFloat(priceInput.value || 0);
    }

    const index = menuData.items.findIndex(i => i.id === id);
    if (index >= 0) menuData.items[index] = updatedItem;
    else menuData.items.push(updatedItem);

    renderMenu();
    modal.style.display = 'none';
    alert('Item salvo localmente. Clique em "Salvar Alteracoes" para publicar.');
  }

  function handleDeleteItem(id) {
    if (confirm(`Tem certeza que deseja excluir o item "${id}"?`)) {
      menuData.items = menuData.items.filter(i => i.id !== id);
      renderMenu();
      alert('Item excluido localmente. Clique em "Salvar Alteracoes" para publicar.');
    }
  }

  async function saveChanges() {
    if (JSON.stringify(menuData) === originalMenuData) return alert('Nenhuma alteracao para salvar.');
    saveChangesBtn.disabled = true;
    saveChangesBtn.textContent = 'Salvando...';
    try {
      const response = await fetch('/.netlify/functions/update-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(menuData)
      });
      if (!response.ok) throw new Error('O servidor retornou um erro.');
      originalMenuData = JSON.stringify(menuData);
      alert('Cardapio salvo com sucesso!');
    } catch (error) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      saveChangesBtn.disabled = false;
      saveChangesBtn.textContent = 'Salvar Alteracoes';
    }
  }

  async function logout() {
    logoutBtn.disabled = true;
    try {
      await fetch('/.netlify/functions/admin-logout', {
        method: 'POST',
        credentials: 'same-origin'
      });
    } finally {
      window.location.replace('login.html');
    }
  }

  const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  init();
});
