// app/combined/page.tsx
import Game from '@/components/Game';
import Detect from '@/components/Detect';
import styles from './combined.module.css';

const CombinedPage = () => {
    return (
        <div className={styles.container}>
            <div className={styles.game}>
                <Game />
            </div>
            <div className={styles.detect}>
                <Detect />
            </div>
        </div>
    );
};

export default CombinedPage;
