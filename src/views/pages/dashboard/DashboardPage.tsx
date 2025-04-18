"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { FileText, Star, Clock, Eye, ThumbsUp, BarChart2, Youtube } from 'lucide-react'
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js"

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

// Sample document data
const sampleDocuments = [
  {
    id: "doc1",
    title: "Project Proposal",
    content: "This is a project proposal for the new marketing campaign...",
    starred: true,
    updated_at: "2023-04-15T10:30:00Z",
    views: 245,
    likes: 18,
    created_at: "2023-05-15T10:30:00Z",
  },
  {
    id: "doc2",
    title: "Meeting Notes",
    content: "Notes from the quarterly planning meeting with stakeholders...",
    starred: false,
    updated_at: "2023-04-10T14:20:00Z",
    views: 132,
    likes: 7,
    created_at: "2023-02-10T14:20:00Z",
  },
  {
    id: "doc3",
    title: "Research Findings",
    content: "Key findings from the market research conducted in Q1...",
    starred: true,
    updated_at: "2023-04-05T09:15:00Z",
    views: 310,
    likes: 24,
    created_at: "2023-09-05T09:15:00Z",
  },
  {
    id: "doc4",
    title: "Product Roadmap",
    content: "Detailed roadmap for product development in the next 6 months...",
    starred: false,
    updated_at: "2023-04-01T16:45:00Z",
    views: 189,
    likes: 15,
    created_at: "2023-09-01T16:45:00Z",
  },
  {
    id: "doc5",
    title: "Budget Planning",
    content: "Budget planning for the next fiscal year...",
    starred: true,
    updated_at: "2023-05-12T11:30:00Z",
    views: 156,
    likes: 12,
    created_at: "2023-05-12T11:30:00Z",
  },
  {
    id: "doc6",
    title: "Marketing Strategy",
    content: "Comprehensive marketing strategy for Q3...",
    starred: false,
    updated_at: "2023-06-18T13:45:00Z",
    views: 203,
    likes: 19,
    created_at: "2023-06-18T13:45:00Z",
  },
  {
    id: "doc7",
    title: "User Research",
    content: "Results from the latest user research study...",
    starred: true,
    updated_at: "2023-07-22T09:20:00Z",
    views: 278,
    likes: 31,
    created_at: "2023-07-22T09:20:00Z",
  },
  {
    id: "doc8",
    title: "Competitor Analysis",
    content: "Detailed analysis of our main competitors...",
    starred: false,
    updated_at: "2023-08-05T15:10:00Z",
    views: 192,
    likes: 14,
    created_at: "2023-08-05T15:10:00Z",
  },
  {
    id: "doc9",
    title: "Product Launch Plan",
    content: "Comprehensive plan for the upcoming product launch...",
    starred: true,
    updated_at: "2023-09-14T10:45:00Z",
    views: 325,
    likes: 28,
    created_at: "2023-09-14T10:45:00Z",
  },
  {
    id: "doc10",
    title: "Annual Report",
    content: "Annual report summarizing company performance...",
    starred: false,
    updated_at: "2023-10-30T14:30:00Z",
    views: 412,
    likes: 36,
    created_at: "2023-10-30T14:30:00Z",
  },
  {
    id: "doc11",
    title: "Team Structure",
    content: "Proposed restructuring of the development team...",
    starred: true,
    updated_at: "2023-11-08T11:20:00Z",
    views: 178,
    likes: 22,
    created_at: "2023-11-08T11:20:00Z",
  },
  {
    id: "doc12",
    title: "Year-End Review",
    content: "Year-end review of all projects and initiatives...",
    starred: false,
    updated_at: "2023-12-20T16:15:00Z",
    views: 267,
    likes: 29,
    created_at: "2023-12-20T16:15:00Z",
  },
]

// Sample YouTube video data
const sampleVideos = [
  {
    id: "vid1",
    title: "Introduction to React 18",
    thumbnail: "https://placehold.co/320x180",
    channel: "React Team",
    views: 125000,
    likes: 8700,
    published_at: "2023-01-12T08:30:00Z",
    duration: "10:24",
    created_at: "2023-06-12T08:30:00Z",
  },
  {
    id: "vid2",
    title: "Building Modern UIs with React and Tailwind",
    thumbnail: "https://placehold.co/320x180",
    channel: "Frontend Masters",
    views: 87000,
    likes: 6200,
    published_at: "2023-02-08T14:15:00Z",
    duration: "15:36",
    created_at: "2023-02-08T14:15:00Z",
  },
  {
    id: "vid3",
    title: "Data Visualization Techniques for Dashboards",
    thumbnail: "https://placehold.co/320x180",
    channel: "Data Science Pro",
    views: 45000,
    likes: 3100,
    published_at: "2023-03-05T11:45:00Z",
    duration: "12:18",
    created_at: "2023-10-05T11:45:00Z",
  },
  {
    id: "vid4",
    title: "Advanced TypeScript Patterns",
    thumbnail: "https://placehold.co/320x180",
    channel: "TypeScript Talks",
    views: 62000,
    likes: 4800,
    published_at: "2023-04-02T09:20:00Z",
    duration: "18:42",
    created_at: "2023-04-02T09:20:00Z",
  },
  {
    id: "vid5",
    title: "Mastering CSS Grid Layout",
    thumbnail: "https://placehold.co/320x180",
    channel: "CSS Masters",
    views: 73000,
    likes: 5400,
    published_at: "2023-05-15T13:10:00Z",
    duration: "14:52",
    created_at: "2023-05-15T13:10:00Z",
  },
  {
    id: "vid6",
    title: "State Management in React Applications",
    thumbnail: "https://placehold.co/320x180",
    channel: "React Experts",
    views: 91000,
    likes: 7200,
    published_at: "2023-06-22T10:30:00Z",
    duration: "20:15",
    created_at: "2023-06-22T10:30:00Z",
  },
  {
    id: "vid7",
    title: "Building Responsive Web Applications",
    thumbnail: "https://placehold.co/320x180",
    channel: "Web Dev Simplified",
    views: 68000,
    likes: 5100,
    published_at: "2023-07-18T15:45:00Z",
    duration: "16:30",
    created_at: "2023-07-18T15:45:00Z",
  },
  {
    id: "vid8",
    title: "JavaScript Performance Optimization",
    thumbnail: "https://placehold.co/320x180",
    channel: "JS Performance",
    views: 54000,
    likes: 4300,
    published_at: "2023-08-09T11:20:00Z",
    duration: "22:48",
    created_at: "2023-08-09T11:20:00Z",
  },
  {
    id: "vid9",
    title: "Building APIs with Node.js",
    thumbnail: "https://placehold.co/320x180",
    channel: "Node Masters",
    views: 82000,
    likes: 6500,
    published_at: "2023-09-14T09:15:00Z",
    duration: "25:10",
    created_at: "2023-09-14T09:15:00Z",
  },
  {
    id: "vid10",
    title: "Introduction to Web3 Development",
    thumbnail: "https://placehold.co/320x180",
    channel: "Web3 Devs",
    views: 105000,
    likes: 8100,
    published_at: "2023-10-28T14:40:00Z",
    duration: "19:35",
    created_at: "2023-10-28T14:40:00Z",
  },
  {
    id: "vid11",
    title: "Accessibility in Web Applications",
    thumbnail: "https://placehold.co/320x180",
    channel: "A11y Experts",
    views: 47000,
    likes: 3900,
    published_at: "2023-11-05T10:50:00Z",
    duration: "17:22",
    created_at: "2023-11-05T10:50:00Z",
  },
  {
    id: "vid12",
    title: "Year in Review: Web Development Trends",
    thumbnail: "https://placehold.co/320x180",
    channel: "Web Dev Trends",
    views: 93000,
    likes: 7400,
    published_at: "2023-12-18T13:25:00Z",
    duration: "28:15",
    created_at: "2023-12-18T13:25:00Z",
  },
]

// Format relative time
const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`
  return `${Math.floor(diffInSeconds / 31536000)} years ago`
}

// Format view count
const formatViewCount = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

// Get month name from date
const getMonthName = (date: Date): string => {
  return date.toLocaleString('default', { month: 'short' })
}

// Generate monthly data for documents and videos
const generateMonthlyData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Count documents by month
  const documentsByMonth = Array(12).fill(0)
  sampleDocuments.forEach(doc => {
    const date = new Date(doc.created_at)
    const month = date.getMonth()
    documentsByMonth[month]++
  })

  // Count videos by month
  const videosByMonth = Array(12).fill(0)
  sampleVideos.forEach(video => {
    const date = new Date(video.created_at)
    const month = date.getMonth()
    videosByMonth[month]++
  })

  return {
    labels: months,
    documentData: documentsByMonth,
    videoData: videosByMonth
  }
}

function App() {
  const [randomDocs, setRandomDocs] = useState<typeof sampleDocuments>([])
  const [randomVideos, setRandomVideos] = useState<typeof sampleVideos>([])
  const [activeTab, setActiveTab] = useState("all")
  const [monthlyData, setMonthlyData] = useState(() => generateMonthlyData())

  // Simulate fetching random documents and videos
  useEffect(() => {
    // Get 3 random documents
    const shuffledDocs = [...sampleDocuments].sort(() => 0.5 - Math.random())
    setRandomDocs(shuffledDocs.slice(0, 3))

    // Get 3 random videos
    const shuffledVideos = [...sampleVideos].sort(() => 0.5 - Math.random())
    setRandomVideos(shuffledVideos.slice(0, 3))

    // Generate monthly data
    setMonthlyData(generateMonthlyData())
  }, [])

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-500">View your recent documents and recommended videos</p>
        </div>

        <div className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === "all" ? "bg-white shadow" : "text-gray-500"
                }`}
                onClick={() => setActiveTab("all")}
              >
                All
              </button>
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === "documents" ? "bg-white shadow" : "text-gray-500"
                }`}
                onClick={() => setActiveTab("documents")}
              >
                Documents
              </button>
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === "videos" ? "bg-white shadow" : "text-gray-500"
                }`}
                onClick={() => setActiveTab("videos")}
              >
                Videos
              </button>
            </div>

          </div>

          <div className="mt-6">
            {activeTab === "all" && (
              <div className="grid gap-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Recent Documents</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {randomDocs.map((doc) => (
                      <DocumentCard key={doc.id} document={doc} />
                    ))}
                  </div>
                </div>

                <hr className="my-4" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Recommended Videos</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {randomVideos.map((video) => (
                      <VideoCard key={video.id} video={video} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "documents" && (
              <div className="grid gap-4 md:grid-cols-3">
                {sampleDocuments.map((doc) => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            )}

            {activeTab === "videos" && (
              <div className="grid gap-4 md:grid-cols-3">
                {sampleVideos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          <StatCardWithChart
            title="Documents Created by Month"
            value={sampleDocuments.length}
            icon={<FileText className="h-4 w-4 text-blue-500" />}
            trend={+12}
            chartData={{
              labels: monthlyData.labels,
              datasets: [
                {
                  label: 'Documents',
                  data: monthlyData.documentData,
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  tension: 0.4,
                  fill: true,
                }
              ]
            }}
          />
          <StatCardWithChart
            title="Videos Created by Month"
            value={sampleVideos.length}
            icon={<Youtube className="h-4 w-4 text-red-500" />}
            trend={+8}
            chartData={{
              labels: monthlyData.labels,
              datasets: [
                {
                  label: 'Videos',
                  data: monthlyData.videoData,
                  borderColor: '#ef4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  tension: 0.4,
                  fill: true,
                }
              ]
            }}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          <StatCard
            title="Total Views"
            value={formatViewCount(
              sampleDocuments.reduce((sum, doc) => sum + doc.views, 0) +
                sampleVideos.reduce((sum, video) => sum + video.views, 0),
            )}
            icon={<Eye className="h-4 w-4 text-green-500" />}
            trend={+24}
          />
          <StatCard
            title="Total Likes"
            value={formatViewCount(
              sampleDocuments.reduce((sum, doc) => sum + doc.likes, 0) +
                sampleVideos.reduce((sum, video) => sum + video.likes, 0),
            )}
            icon={<ThumbsUp className="h-4 w-4 text-yellow-500" />}
            trend={+18}
          />
        </div>
      </div>
    </div>
  )
}

interface DocumentCardProps {
  document: {
    id: string
    title: string
    content: string
    starred: boolean
    updated_at: string
    views: number
    likes: number
  }
}

function DocumentCard({ document }: DocumentCardProps) {
  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="font-medium">{document.title}</h3>
          </div>
          {document.starred && <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />}
        </div>
      </div>
      <div className="px-4">
        <p className="text-sm text-gray-500 line-clamp-2 h-10">{document.content}</p>
      </div>
      <div className="px-4 py-3 flex justify-between border-t mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{formatRelativeTime(document.updated_at)}</span>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{formatViewCount(document.views)}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" />
            <span>{document.likes}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface VideoCardProps {
  video: {
    id: string
    title: string
    thumbnail: string
    channel: string
    views: number
    likes: number
    published_at: string
    duration: string
  }
}

function VideoCard({ video }: VideoCardProps) {
  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="relative">
        <img
          src={video.thumbnail || "/placeholder.svg"}
          alt={video.title}
          className="w-full object-cover aspect-video"
        />
        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
          {video.duration}
        </span>
      </div>
      <div className="p-4 pb-2">
        <h3 className="font-medium text-base line-clamp-1">{video.title}</h3>
        <p className="text-sm text-gray-500">{video.channel}</p>
      </div>
      <div className="px-4 pb-4 flex justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{formatRelativeTime(video.published_at)}</span>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{formatViewCount(video.views)}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" />
            <span>{formatViewCount(video.likes)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend: number
}

function StatCard({ title, value, icon, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-gray-500 mt-1 flex items-center">
          <span className={trend > 0 ? "text-green-500" : "text-red-500"}>
            {trend > 0 ? "+" : ""}
            {trend}%
          </span>
          <span className="ml-1">from last month</span>
        </p>
      </div>
    </div>
  )
}

interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    borderColor: string
    backgroundColor: string
    tension: number
    fill: boolean
  }[]
}

interface StatCardWithChartProps extends StatCardProps {
  chartData: ChartData
}

function StatCardWithChart({ title, value, icon, trend, chartData }: StatCardWithChartProps) {
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          precision: 0,
        },
      },
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 5,
      },
    },
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-gray-500 mt-1 mb-4 flex items-center">
          <span className={trend > 0 ? "text-green-500" : "text-red-500"}>
            {trend > 0 ? "+" : ""}
            {trend}%
          </span>
          <span className="ml-1">from last month</span>
        </p>
        <div className="h-48">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  )
}

export default App
