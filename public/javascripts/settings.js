(($) => {
  // Shows the autofocused input tooltip
  $(() => {
    $('[data-toggle="tooltip"]').tooltip();
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

  // Shows invalid feedback when password and cofirm password fields
  // are not equal
  $('#new-password, #confirm-new-password').on('keyup', () => {
    const invfb = $('.invalid-feedback:eq(2)');
    if ($('#new-password').val() !== $('#confirm-new-password').val()) {
      if (!invfb.hasClass('d-block')) {
        invfb.html('Password does not match.').addClass('d-block');
      }
    } else if (invfb.hasClass('d-block')) {
      invfb.html('Plese enter a valid password.').removeClass('d-block');
    }
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
  togglePassword('#new-password', '#new-password-toggle-addon');
  togglePassword('#confirm-new-password', '#confirm-new-password-toggle-addon');

  // Adds max restriction value to date input field
  $(() => {
    $('#date').prop('max', () => new Date().toISOString().split('T')[0]);
  });
})(jQuery);
