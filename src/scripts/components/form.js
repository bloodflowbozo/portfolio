export default class Form {
  constructor(element) {
    this.element = element;
    this.formElements = this.element.elements;

    this.init();
  }

  init() {
    this.element.setAttribute('novalidate', '');
    for (let i = 0; i < this.formElements.length; i++) {
      const input = this.formElements[i];
      if (input.required) {
        input.addEventListener('input', this.validateInput.bind(this));
      }
    }
    this.element.addEventListener('submit', this.onSubmit.bind(this));
  }

  onSubmit(event) {
    event.preventDefault();
    if (this.validate()) {
      console.log('success'); // envoi ajax du formulaire
      this.showConfirmation();
    } else {
      console.log('fail');
    }
  }

  validate() {
    console.log('validate');
    let isValid = true;

    for (let i = 0; i < this.formElements.length; i++) {
      const input = this.formElements[i];

      if (input.willValidate && input.required && !this.validateInput(input)) {
        isValid = false;
      }
    }
    return isValid;
  }

  validateInput(event) {
    const input = event.currentTarget || event;

    if (input.validity.valid) {
      // pas d'erreur
      this.removeError(input);
    } else {
      // erreur a afficher
      this.addError(input);
    }
    return input.validity.valid;
  }

  getContainer(input) {
    return (
      input.closest('[data-input-container]') ||
      input.closest('.contact__field') ||
      input.closest('.input')
    );
  }

  addError(input) {
    const container = this.getContainer(input);
    if (container) {
      container.classList.add('error');
    }
  }

  removeError(input) {
    const container = this.getContainer(input);
    if (container) {
      container.classList.remove('error');
    }
  }

  showConfirmation() {
    this.element.classList.add('is-sent');
  }
}
