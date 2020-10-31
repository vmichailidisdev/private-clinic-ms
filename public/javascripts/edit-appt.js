(($) => {
  // Shows valid and invalid messages on form load
  // by adding the class was-validated
  $(() => {
    window.addEventListener('load', () => {
      const forms = document.getElementsByClassName('needs-validation');
      Array.prototype.filter.call(forms, (form) => {
        form.addEventListener('submit', (event) => {
          if (form.checkValidity() === false) {
            event.preventDefault();
            event.stopPropagation();
          }
          form.classList.add('was-validated');
        }, false);
      });
    }, false);
  });
})(jQuery);
