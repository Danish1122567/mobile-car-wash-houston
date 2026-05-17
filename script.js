const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".nav-menu a");
const bookingForm = document.querySelector("#booking-form");
const formMessage = document.querySelector("#form-message");

if (navToggle) {
  navToggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    document.body.classList.remove("nav-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

const setMessage = (message, isError = false) => {
  formMessage.textContent = message;
  formMessage.classList.toggle("error", isError);
};

const getFormData = (form) => {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
};

const markInvalidFields = (form) => {
  let firstInvalid = null;
  const fields = form.querySelectorAll("input[required], select[required]");

  fields.forEach((field) => {
    const invalid = !field.value.trim();
    field.classList.toggle("invalid", invalid);

    if (invalid && !firstInvalid) {
      firstInvalid = field;
    }
  });

  if (firstInvalid) {
    firstInvalid.focus();
  }

  return !firstInvalid;
};

bookingForm?.addEventListener("input", (event) => {
  if (event.target.matches("input, select")) {
    event.target.classList.remove("invalid");
  }
});

bookingForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!markInvalidFields(bookingForm)) {
    setMessage("Please complete every field so we can confirm your booking.", true);
    return;
  }

  const submitButton = bookingForm.querySelector("button[type='submit']");
  const booking = getFormData(bookingForm);

  submitButton.disabled = true;
  submitButton.textContent = "Sending...";
  setMessage("");

  try {
    const response = await fetch("/book", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(booking)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Booking could not be saved.");
    }

    bookingForm.reset();
    setMessage(result.message || "We will contact you soon via Messenger or phone.");
  } catch (error) {
    setMessage(
      "We could not reach the booking server. Please try again or book via Messenger.",
      true
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Booking Request";
  }
});
