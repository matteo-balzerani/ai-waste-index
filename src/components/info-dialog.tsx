"use client";

import { useEffect, useRef } from "react";
import type { PublicResult } from "@/contracts";
import type { Dictionary } from "@/i18n/types";

export type InfoSection = "overview" | "environment";

export function InfoDialog({ dictionary: d, result, section, opener, onClose }: {
  dictionary: Dictionary;
  result: PublicResult | null;
  section: InfoSection;
  opener: HTMLElement | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const environment = useRef<HTMLHeadingElement>(null);
  const demo = result?.methodologyVersion.startsWith("stub-") ?? false;

  useEffect(() => {
    const modal = dialog.current!;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    modal.showModal();
    const target = section === "environment" ? environment.current : heading.current;
    target?.focus({ preventScroll: true });
    if (section === "environment") target?.scrollIntoView({ block: "start" });
    return () => {
      modal.close();
      document.documentElement.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [section, opener]);

  return <dialog ref={dialog} className="share-dialog info-dialog" aria-labelledby="info-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="share-panel-heading">
      <h2 id="info-title" ref={heading} tabIndex={-1}>{d.inputShell.estimateLink}</h2>
      <button className="text-action" type="button" onClick={onClose}>{d.sharing.close}</button>
    </div>
    <div className="info-scroll disclosure-body">
      {result && <p className="version-label">{d.analysis.methodologyVersion}: {result.methodologyVersion}</p>}
      {demo ? <p>{d.analysis.demoNotice}</p> : <>
        <h3>{d.landing.estimateNoticeTitle}</h3>
        <p>{d.landing.estimateNoticeBody}</p>
        <p>{d.analysis.experimentalNotice} {d.sharing.disclaimer}</p>
        <p>{d.analysis.methodologyBody}</p>
        <p>{d.analysis.scoreBasis}</p>
        <p>{d.analysis.disclaimer}</p>
        <p>{d.analysis.inferenceNotice}</p>
        <p>{d.analysis.comparabilityNotice}</p>
      </>}
      {result?.score === 0 && <p className="zero-notice">{d.analysis.zeroScoreNotice}</p>}
      {!demo && <>
        <h3 ref={environment} tabIndex={-1}>{d.analysis.estimatesTitle}</h3>
        <p id="environment-note">{d.analysis.environmentNotice}</p>
      </>}
      <h3>{d.info.privacyTitle}</h3>
      <p>{d.info.privacyBody}</p>
      <p>{result ? d.analysis.privacy : d.inputShell.privacyNotice}</p>
      <h3>{d.info.inputTitle}</h3>
      <p>{d.extraction.availability}</p>
      <p>{d.inputShell.modes.screenshot.description}</p>
      <p>{d.inputShell.modes.screenshot.fieldHint}</p>
    </div>
  </dialog>;
}
