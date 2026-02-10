"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    MessageCircle,
    Eye,
    Shield,
    Clock,
    User,
} from "lucide-react";
import { motion } from "framer-motion";

interface SearchResult {
    id: number;
    title: string;
    content: string;
    author: string;
    author_id: number;
    scan_type?: string;
    created_at: string;
    views: number;
    likes: number;
    profile_image_url?: string;
    type: "post" | "user";
}

const SearchPage: React.FC = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get("q") || "";
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (query.trim()) {
            performSearch();
        }
    }, [query]);

    const performSearch = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch(
                `/api/search?q=${encodeURIComponent(query)}`,
            );
            if (response.ok) {
                const data = await response.json();
                setResults(data.results || []);
            } else {
                setError("검색 중 오류가 발생했습니다.");
            }
        } catch (err) {
            setError("검색을 수행할 수 없습니다.");
            console.error("Search error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleResultClick = (result: SearchResult) => {
        if (result.type === "post") {
            router.push(`/community/${result.id}`);
        } else {
            router.push(`/experts/${result.author_id}`);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 pb-20">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                        검색 결과
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        "{query}"에 대한 검색 결과 {results.length}개
                    </p>
                </div>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">
                            검색 중...
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                    <p className="text-red-700 dark:text-red-400">{error}</p>
                </div>
            )}

            {!loading && results.length > 0 && (
                <div className="space-y-4">
                    {results.map((result, index) => (
                        <motion.div
                            key={result.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleResultClick(result)}
                            className="bg-white dark:bg-neutral-900 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-neutral-800 hover:shadow-md dark:hover:shadow-neutral-800/50 transition-all cursor-pointer"
                        >
                            <div className="flex items-start gap-4">
                                {result.profile_image_url && (
                                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden flex-shrink-0">
                                        <img
                                            src={result.profile_image_url}
                                            alt={result.author}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h3 className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                                        {result.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                        {result.content}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <User size={14} />
                                            <span>{result.author}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock size={14} />
                                            <span>
                                                {new Date(
                                                    result.created_at,
                                                ).toLocaleDateString("ko-KR")}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Eye size={14} />
                                            <span>{result.views}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MessageCircle size={14} />
                                            <span>{result.likes}</span>
                                        </div>
                                        {result.scan_type && (
                                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                                <Shield size={14} />
                                                <span>{result.scan_type}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {!loading && results.length === 0 && !error && query && (
                <div className="text-center py-12">
                    <MessageCircle
                        size={48}
                        className="mx-auto mb-4 text-gray-300 dark:text-neutral-700"
                    />
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        검색 결과가 없습니다
                    </h3>
                    <p className="text-gray-500 dark:text-gray-500">
                        다른 검색어로 시도해보세요.
                    </p>
                </div>
            )}

            {!loading && results.length === 0 && !error && !query && (
                <div className="text-center py-12">
                    <MessageCircle
                        size={48}
                        className="mx-auto mb-4 text-gray-300 dark:text-neutral-700"
                    />
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        검색어를 입력하세요
                    </h3>
                    <p className="text-gray-500 dark:text-gray-500">
                        게시글, 사용자, 전문가 등을 검색할 수 있습니다.
                    </p>
                </div>
            )}
        </div>
    );
};

function SearchPageWrapper() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center items-center min-h-screen">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
            }
        >
            <SearchPage />
        </Suspense>
    );
}

export default SearchPageWrapper;
