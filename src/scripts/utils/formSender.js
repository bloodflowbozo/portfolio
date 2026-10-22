export default class Main {
  constructor() {
    this.init();
  }

  init() {
    this.initForm();
  }

  initForm() {
    const form = document.querySelector('.contact__form');
    const formBody = document.querySelector('.form__body');
    const confirmation = document.querySelector('.form__confirmation');

    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const formData = new FormData(form);

      fetch('https://formsubmit.co/ajax/marcos.sosa.silva002@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(Object.fromEntries(formData)),
      })
        .then((response) => response.json())
        .then((data) => {
          if (formBody) formBody.style.display = 'none';
          if (confirmation) confirmation.style.display = 'block';
        })
        .catch((error) => {
          console.error("Erreur lors de l'envoi :", error);
          alert("Une erreur est survenue lors de l'envoi.");
        });
    });
  }
}
