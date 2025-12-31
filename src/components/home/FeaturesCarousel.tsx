import { useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';

interface FeaturesCarouselProps {
    features: {
        icon: any;
        title: string;
        description: string;
        color: string;
        iconBg: string;
    }[];
}

export function FeaturesCarousel({ features }: FeaturesCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const scrollContainer = scrollRef.current;
        if (!scrollContainer) return;

        let scrollInterval: NodeJS.Timeout;

        const startAutoScroll = () => {
            scrollInterval = setInterval(() => {
                if (!scrollContainer) return;

                // Calculate scroll position
                const maxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
                let nextScrollLeft = scrollContainer.scrollLeft + 300; // Scroll by roughly one card width

                // Loop back to start if reached end
                if (nextScrollLeft >= maxScrollLeft - 10) { // Tolerance
                    nextScrollLeft = 0;
                    // Smooth scroll for loop might be jarring, use 'auto' or improved loop logic, 
                    // but for simple auto-scroll restart:
                    scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    scrollContainer.scrollTo({ left: nextScrollLeft, behavior: 'smooth' });
                }
            }, 3000); // Scroll every 3 seconds
        };

        startAutoScroll();

        // Pause on interaction
        const stopAutoScroll = () => clearInterval(scrollInterval);

        scrollContainer.addEventListener('touchstart', stopAutoScroll);
        scrollContainer.addEventListener('mouseenter', stopAutoScroll);
        scrollContainer.addEventListener('touchend', startAutoScroll);
        scrollContainer.addEventListener('mouseleave', startAutoScroll);

        return () => {
            clearInterval(scrollInterval);
            if (scrollContainer) {
                scrollContainer.removeEventListener('touchstart', stopAutoScroll);
                scrollContainer.removeEventListener('mouseenter', stopAutoScroll);
                scrollContainer.removeEventListener('touchend', startAutoScroll);
                scrollContainer.removeEventListener('mouseleave', startAutoScroll);
            }
        };
    }, []);

    return (
        <div
            ref={scrollRef}
            className="md:hidden flex overflow-x-auto snap-x snap-mandatory pb-8 -mx-4 px-4 gap-4 scrollbar-hide"
        >
            {features.map((feature, index) => (
                <Card
                    key={index}
                    className="flex-shrink-0 w-[85vw] sm:w-[350px] snap-center group relative p-6 bg-white border border-gray-100 shadow-xl shadow-gray-200/40 rounded-[2rem] overflow-hidden"
                >
                    {/* Decorative gradient */}
                    <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${feature.color} opacity-[0.08] rounded-full blur-3xl -translate-y-12 translate-x-12`}></div>

                    <div className={`w-14 h-14 ${feature.iconBg} rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-${feature.color.split(' ')[0].replace('from-', '')}/30`}>
                        <feature.icon className="w-7 h-7 text-white" />
                    </div>

                    <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                    <p className="text-base text-gray-600 leading-relaxed font-medium">{feature.description}</p>
                </Card>
            ))}
        </div>
    );
}
