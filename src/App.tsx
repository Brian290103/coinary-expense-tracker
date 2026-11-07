import { Toaster } from "@/components/Toaster";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import ScrollToTop from "./components/ScrollToTop";
import AppShell from "@/components/AppShell";
import Home from "@/pages/Home";
import Transactions from "@/pages/Transactions";
import Insights from "@/pages/Insights";
import Budgets from "@/pages/Budgets";
import Settings from "@/pages/Settings";
import Categories from "@/pages/Categories";
import Accounts from "@/pages/Accounts";
import Onboarding from "@/pages/Onboarding";
import ToastHost from "@/components/ToastHost";

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/accounts" element={<Accounts />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <Toaster />
      <ToastHost />
    </Router>
  );
}

export default App;
