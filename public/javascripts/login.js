(($) => {
  // Shows the autofocused input tooltip
  $(() => {
    $('[data-toggle="tooltip"]').tooltip();
    $('[autofocus]').tooltip('show');
  });

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

  // Adds show and hide password functionality
  function togglePassword(inputID, buttonID) {
    $(buttonID).click(() => {
      if ($(inputID).attr('type') === 'password') {
        $(inputID).attr('type', 'text');
        $(`${buttonID} > i`).removeClass('fa-eye').addClass('fa-eye-slash');
      } else {
        $(inputID).attr('type', 'password');
        $(`${buttonID} > i`).removeClass('fa-eye-slash').addClass('fa-eye');
      }
    });
  }

  togglePassword('#password', '#password-toggle-addon');
})(jQuery);
