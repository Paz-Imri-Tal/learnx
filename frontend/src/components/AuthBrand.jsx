import logo from "../assets/logo.png";

export default function AuthBrand() {
  return (
    <div className="auth-brand">
      <img src={logo} alt="לוגו LearnX" className="auth-brand-logo" />
      <p className="auth-brand-subtitle">מערכת לניהול התואר</p>
    </div>
  );
}
