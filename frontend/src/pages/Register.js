import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
  });

  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/accounts/register/`,
        form
      );
      alert("Registration successful!");
      navigate("/");
    } 
    catch (error) {
  console.log(error.response?.data);
  alert(JSON.stringify(error.response?.data));
}
  };

  return (
    <div>
      <h2>Register</h2>
      <input
        placeholder="Username"
        onChange={(e) =>
          setForm({ ...form, username: e.target.value })
        }
      />
      <br />
      <input
        placeholder="Email"
        onChange={(e) =>
          setForm({ ...form, email: e.target.value })
        }
      />
      <br />
      <input
        type="password"
        placeholder="Password"
        onChange={(e) =>
          setForm({ ...form, password: e.target.value })
        }
      />
      <br />
      <input
        type="password"
        placeholder="Confirm Password"
        onChange={(e) =>
          setForm({ ...form, password2: e.target.value })
        }
      />
      <br />
      <button onClick={handleRegister}>Register</button>
    </div>
  );
}

export default Register;