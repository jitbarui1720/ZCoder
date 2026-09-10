import React, { useState } from "react";
import logo from "../assets/zcoder-logo.png";
import { Link, useNavigate } from "react-router";

const API_URL = import.meta.env.VITE_API_URL;

function GoogleIcon({className = ""}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function Signup() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Reset error state
    const { firstName, lastName, username, email, password, confirmPassword } =
      formData;

    if (
      !firstName ||
      !lastName ||
      !username ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Password strength validation (example)
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError(
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      );
      return;
    }

    if (!agreeToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          username,
          email,
          password,
        }),
      });

      const responseData = await res.json(); // Always parse the response body

      if (!res.ok) {
        throw new Error(responseData.message || "Signup failed");
      }

      alert(`Account created for ${username}! Redirecting to login...`);
      navigate("/login");
    } catch (error) {
      setError(error.message || "Signup failed. Please try again.");
      return;
    }
  };

  const handleGoogleSignup = () => {
    alert("Google signup would be initiated here");
  };

  return (
    <div className="
      flex flex-col md:flex-row
      m-0 p-0 w-full min-h-screen
      bg-linear-to-t from-blue-200 via-white to-white 
      font-['Segoe UI',Tahoma,Geneva,Verdana,sans-serif]
    ">
      <div className="flex md:flex-1 justify-center items-center">
        <img src={logo} alt="Z Coder Logo" 
          className="w-[70%] rounded-full max-w-30 h-30 md:h-fit md:max-w-75"
        />
      </div>
      <div className="flex flex-1 flex-col items-center
        m-0 md:m-2.5 overflow-hidden w-full 
        bg-white 
        rounded-[20px_20px_0_0] md:rounded-[20px] 
        shadow-[0_-5px_25px_rgba(0,0,0,0.1)] md:shadow-[0_15px_35px_rgba(0,0,0,0.1)] 
        animate-slide-up
      ">
        <div className="w-full text-white p-3.75 md:p-7.5 text-center bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)]">
          <h1 className="text-[22px] sm:text-[28px] m-2 font-semibold ">Create Account</h1>
          <p className="opacity-[0.9] text-[16px] ">Join ZCoder community today</p>
        </div>
        {error && (
          <div
            role="alert"
            style={{
              color: "red",
              fontWeight: "600",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}
        <form className="w-full p-[15px_20px_25px] sm:p-[20px_30px_30px] md:p-10" 
          onSubmit={handleSubmit}
        >
          <div className="mb-5">
            <label
              className="block mb-8px font-medium text-[#333]"
              htmlFor="firstName">First Name</label>
            <input
              className="p-[10px_14px] text-sm
                w-full sm:p-[12px_16px] sm:text-[16px]
                border-2 border-[#e1e1e1] rounded-[10px]
                transition-all duration-300
                bg-[#fafafa]
                hover:outline-none
                hover:border-[#667eea]
                hover:bg-white
                hover:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]
              "
              type="text"
              name="firstName"
              id="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-5">
            <label
              className="block mb-8px font-medium text-[#333]"
              htmlFor="lastName">Last Name</label>
            <input
              className="p-[10px_14px] text-sm
                w-full sm:p-[12px_16px] sm:text-[16px]
                border-2 border-[#e1e1e1] rounded-[10px]
                transition-all duration-300
                bg-[#fafafa]
                hover:outline-none
                hover:border-[#667eea]
                hover:bg-white
                hover:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]
              "
              type="text"
              name="lastName"
              id="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          
          </div>
          <div className="mb-5">
            <label
              className="block mb-8px font-medium text-[#333]"
              htmlFor="username">Username</label>
            <input
              className="p-[10px_14px] text-sm
                w-full sm:p-[12px_16px] sm:text-[16px]
                border-2 border-[#e1e1e1] rounded-[10px]
                transition-all duration-300
                bg-[#fafafa]
                hover:outline-none
                hover:border-[#667eea]
                hover:bg-white
                hover:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]
              "
              type="text"
              name="username"
              id="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-5">
            <label
              className="block mb-8px font-medium text-[#333]"
              htmlFor="email">Email</label>
            <input
              className="p-[10px_14px] text-sm
                w-full sm:p-[12px_16px] sm:text-[16px]
                border-2 border-[#e1e1e1] rounded-[10px]
                transition-all duration-300
                bg-[#fafafa]
                hover:outline-none
                hover:border-[#667eea]
                hover:bg-white
                hover:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]
              "
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-5">
            <label
              className="block mb-8px font-medium text-[#333]"
              htmlFor="password">Password</label>
            <input
              className="p-[10px_14px] text-sm
                w-full sm:p-[12px_16px] sm:text-[16px]
                border-2 border-[#e1e1e1] rounded-[10px]
                transition-all duration-300
                bg-[#fafafa]
                hover:outline-none
                hover:border-[#667eea]
                hover:bg-white
                hover:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]
              "
              type="password"
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-5">
            <label
              className="block mb-8px font-medium text-[#333]"
              htmlFor="confirmPassword">Confirm Password</label>
            <input
              className="p-[10px_14px] text-sm
                w-full sm:p-[12px_16px] sm:text-[16px]
                border-2 border-[#e1e1e1] rounded-[10px]
                transition-all duration-300
                bg-[#fafafa]
                hover:outline-none
                hover:border-[#667eea]
                hover:bg-white
                hover:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]
              "
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-3">
            {/* Terms checkbox */}
            <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                required
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#667eea] focus:ring-[#667eea]"
              />
              <span>
                I agree to the{" "}
                <Link
                  to="#"
                  className="text-[#667eea] hover:underline no-underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="#"
                  className="text-[#667eea] hover:underline no-underline"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>

            {/* Newsletter checkbox */}
            <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={subscribeNewsletter}
                onChange={(e) => setSubscribeNewsletter(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#667eea] focus:ring-[#667eea]"
              />
              <span>I want to receive updates and newsletters</span>
            </label>
          </div>

          <button
            className="
              w-full p-3 sm:p-3.5 bg-linear-to-br from-[#667eea] to-[#764ba2]
              text-white border-none rounded-[10px]
              text-sm sm:text-[16px] font-semibold
              cursor-pointer
              transition-all duration-300
              my-5
              hover:-translate-y-0.5
              hover:shadow-[0_5px_15px_rgba(102,126,234,0.4)]
            "
            type="submit"
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#333")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#111")
            }
          >
            Sign Up
          </button>

          <div className="
            flex items-center m-[30px_0] text-[#666]
            before:content-[]
            before:flex-1
            before:h-px
            before:bg-[#e1e1e1]
            after:content-[]
            after:flex-1
            after:h-px
            after:bg-[#e1e1e1]
          ">
            <span className="p-[0_20px] text-sm">or continue with</span>
          </div>

          <div className="flex flex-col gap-2.5 md:gap-3">
            <button
              type="button"
              className="flex items-center justify-center
                text-sm md:text-[16px]
                p-2.5 md:p-3 border-2 border-[#4285f4] rounded-[10px]
                bg-white text-[#4285f4] no-underline font-medium
                transition-all duration-200 ease-in-out
                cursor-pointer
                hover:bg-[#4285f4]
                hover:text-white
                hover:-translate-y-px
                hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]
              "
              onClick={handleGoogleSignup}
            >
              <GoogleIcon className="w-5 h-5 mr-3" />
              Continue with Google
            </button>
          </div>

          <div className="text-center text-[#666] mt-7.5 pt-5 border-t border-t-[#e1e1e1]">
            Already have an account? <Link to="/login" className="text-[#667eea] no-underline font-medium hover:underline">Login here</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
