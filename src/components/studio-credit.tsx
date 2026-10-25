import Image from "next/image";
import flowquanticLogo from "../../public/brand/flowquantic-logo-white.png";
import styles from "./studio-credit.module.css";

export function StudioCredit() {
  return (
    <div className={styles.signature}>
      <a
        href="https://www.flowquantic.ai/"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
      >
        <span className={styles.label}>Powered by</span>
        <Image
          src={flowquanticLogo}
          alt="FlowQuantic"
          className={styles.logo}
          sizes="(max-width: 767px) 128px, 112px"
        />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  );
}
