"use client";

import PageApp from "../components/PageApp";
import Explorer from "../components/Explorer";
import { useLangue } from "../components/LangueProvider";

// Page explorer
export default function PageExplorer() {
  const { t } = useLangue();
  return (
    <PageApp titre={t.explorer.titre}>
      {(userId, estAdmin) => <Explorer userId={userId} estAdmin={estAdmin} />}
    </PageApp>
  );
}
