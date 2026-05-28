
import { TbCurrencyRupee, TbCurrencyYen, TbCurrencyLira, TbCurrencyBaht } from 'react-icons/tb';
import { motion } from 'framer-motion';

const symbols = [
  { Icon: TbCurrencyRupee, color: '#26A17B', size: 64, name: 'USDT' }, // Tether USDT
  { Icon: TbCurrencyRupee, color: '#FF0000', size: 64, name: 'IDR' }, // Indonesian Rupiah
  { Icon: TbCurrencyRupee, color: '#FF9933', size: 64, name: 'INR' }, // Indian Rupee
  { Icon: TbCurrencyBaht, color: '#00247D', size: 64, name: 'THB' }, // Thai Baht
  { Icon: TbCurrencyRupee, color: '#DA251D', size: 64, name: 'VND' }, // Vietnamese Dong
  { Icon: TbCurrencyYen, color: '#DE2910', size: 64, name: 'CNY' }, // Chinese Yuan
  { Icon: TbCurrencyLira, color: '#E30A17', size: 64, name: 'TRY' }, // Turkish Lira
  { Icon: TbCurrencyRupee, color: '#009c3b', size: 64, name: 'BRL' }, // Brazilian Real
];

// Create positions with better distribution
const createGridPositions = (numIcons) => {
  const positions = [];
  const gridSize = Math.ceil(Math.sqrt(numIcons));
  const cellSize = 100 / gridSize;

  for (let i = 0; i < numIcons; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;

    const randomOffsetX = (Math.random() - 0.5) * (cellSize * 0.6);
    const randomOffsetY = (Math.random() - 0.5) * (cellSize * 0.6);

    const baseX = (col * cellSize) + (cellSize / 2);
    const baseY = (row * cellSize) + (cellSize / 2);

    positions.push({
      left: `${Math.max(5, Math.min(95, baseX + randomOffsetX))}%`,
      top: `${Math.max(5, Math.min(95, baseY + randomOffsetY))}%`,
    });
  }

  return positions;
};

const positions = createGridPositions(symbols.length * 2);

const BackgroundAnimation = () => {
  return (
    <div 
      className="fixed inset-0 overflow-hidden"
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(188, 231, 4, 0.15) 0%, rgba(188, 231, 4, 0.05) 100%)',
      }}
    >
      {positions.map((position, i) => {
        const symbol = symbols[i % symbols.length];
        const duration = 3 + Math.random() * 2;
        const delay = Math.random() * -2;

        return (
          <motion.div
            key={i}
            className="absolute z-0"
            style={{
              ...position,
              opacity: 0.15,
            }}
            animate={{
              y: [0, 20, 0],
            }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          >
            <motion.div
              whileHover={{
                scale: 1.5,
                opacity: 1,
                rotate: [-10, 10],
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 17,
                rotate: {
                  duration: 1,
                  repeat: Infinity,
                  repeatType: "reverse"
                }
              }}
              className="relative p-4 cursor-pointer"
              style={{
                filter: 'blur(1.5px)',
              }}
            >
              <div 
                className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `radial-gradient(circle at center, ${symbol.color}40 0%, transparent 70%)`,
                  transform: 'scale(1.5)',
                }}
              />
              <motion.div
                className="relative z-10"
                animate={{ scale: [0.95, 1.05, 0.95] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div 
                  className="rounded-full flex items-center justify-center"
                  style={{
                    width: symbol.size * 1.5,
                    height: symbol.size * 1.5,
                    backgroundColor: `${symbol.color}15`,
                    border: `2px solid ${symbol.color}30`
                  }}
                >
                  <symbol.Icon
                    size={symbol.size * 0.7}
                    color={symbol.color}
                    title={symbol.name}
                  />
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default BackgroundAnimation;
