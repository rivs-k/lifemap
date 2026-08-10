"use client";

import PageApp from "../components/PageApp";
import Calendrier from "../components/Calendrier";
import { useLangue } from "../components/LangueProvider";

export default function Agenda() {
  const { t } = useLangue();
  return (
    <PageApp titre={t.agenda.titre}>{(userId) => <Calendrier userId={userId} />}</PageApp>
  );
}
