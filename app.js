// app.js
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('taplist-container');

  fetch('taplist.json')
    .then(response => response.json())
    .then(data => {
      data.forEach(beer => {
        const card = document.createElement('div');
        card.className = 'beer-card';
        card.innerHTML = `
          <h2>${beer.name}</h2>
          <p>Type: ${beer.type}</p>
          <p>ABV: ${beer.abv}</p>
          <p>Price: ${beer.price}</p>
        `;
        container.appendChild(card);
      });
    })
    .catch(err => console.error('Failed to load taplist:', err));
});
