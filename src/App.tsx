import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { RunDetail } from "./pages/RunDetail.tsx";
import { Review } from "./pages/Review.tsx";
import { DeepReview } from "./pages/DeepReview.tsx";
import { DeepReviewDetail } from "./pages/DeepReviewDetail.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/runs/:runId" element={<RunDetail />} />
          <Route path="/review" element={<Review />} />
          <Route path="/deep-review" element={<DeepReview />} />
          <Route path="/deep-review/:runId" element={<DeepReviewDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
