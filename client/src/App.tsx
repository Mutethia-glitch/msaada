import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import SiteFooter from "./components/SiteFooter";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("./pages/Home"));
const Discover = lazy(() => import("./pages/Discover"));
const NeedDetail = lazy(() => import("./pages/NeedDetail"));
const CreateNeed = lazy(() => import("./pages/CreateNeed"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const SignIn = lazy(() => import("./pages/SignIn"));
const ImpactStory = lazy(() => import("./pages/ImpactStory"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const FAQ = lazy(() => import("@/pages/FAQ"));
const Support = lazy(() => import("@/pages/Support"));

function Router() {
  return <Suspense fallback={<div className="route-loading">Loading Msaada…</div>}>
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/discover" component={Discover} />
      <Route path="/needs/:id" component={NeedDetail} />
      <Route path="/create" component={CreateNeed} />
      <Route path="/signin" component={SignIn} />
      <Route path="/impact/kibera-water" component={ImpactStory} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin" component={Admin} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/faq" component={FAQ} />
      <Route path="/support" component={Support} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  </Suspense>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <SiteFooter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
