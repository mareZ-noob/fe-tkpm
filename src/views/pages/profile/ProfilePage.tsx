"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Edit2, Save, X, UserIcon, Camera, Calendar, Mail } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { BaseUser, UserUpdate } from "@/interfaces/user/UserInterface"
import UserService from "@/services/user/UserService"

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<BaseUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true)
        const userData = await UserService.getUserProfile()
        setUser(userData)
      } catch (err) {
        setError("Failed to fetch user profile" + err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    setUser((prev) => {
      if (!prev) return prev
      return { ...prev, [name]: value }
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const imageUrl = URL.createObjectURL(file)

      setUser((prev) => {
        if (!prev) return prev
        return { ...prev, avatar: imageUrl }
      })
    }
  }

  const toggleEdit = () => {
    if (isEditing) {
      if (!user) {
        setError("User data is not available.")
        return
      }

      const { first_name, last_name, description, date_of_birth, avatar } = user
      const userUpdateData: UserUpdate = { first_name, last_name, description, date_of_birth, avatar }

      setLoading(true)
      UserService.updateUserProfile(userUpdateData)
        .then((response) => {
          setUser(response)
          setIsEditing(false)
        })
        .catch((err) => {
          setError("Failed to update user profile: " + err)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setIsEditing(true)
    }
  }

  const handleDiscard = () => {
    // Fetch the original user data again to discard changes
    setLoading(true)
    UserService.getUserProfile()
      .then((userData) => {
        setUser(userData)
        setIsEditing(false)
      })
      .catch((err) => {
        setError("Failed to fetch user profile" + err)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-t-teal-500 border-slate-200 animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-teal-500 to-emerald-500 py-8 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_60%)]"></div>
        </div>
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.h1
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 100 }}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white flex items-center"
          >
            <UserIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 mr-3" />
            My Profile
          </motion.h1>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleEdit}
              className={`flex items-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-white font-medium text-sm sm:text-base transition-all duration-200 ${
                isEditing ? "bg-teal-700 hover:bg-teal-800" : "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              }`}
              aria-label={isEditing ? "Save changes" : "Edit profile"}
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Save
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Edit
                </>
              )}
            </motion.button>
            {isEditing && (
              <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDiscard}
                className="flex items-center px-3 py-2 sm:px-4 sm:py-2.5 bg-rose-500 hover:bg-rose-600 rounded-lg text-white font-medium text-sm sm:text-base transition-all duration-200 backdrop-blur-sm"
                aria-label="Discard changes"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Discard
              </motion.button>
            )}
          </div>
        </div>
      </header>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-4 mx-auto max-w-7xl mt-4 rounded-r-md shadow-sm"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-rose-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => setError(null)}
                    className="inline-flex rounded-md p-1.5 text-rose-500 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2 focus:ring-offset-rose-50"
                  >
                    <span className="sr-only">Dismiss</span>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Content */}
      <main className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Profile header with background */}
            <div className="h-32 sm:h-40 bg-gradient-to-r from-teal-400/30 to-emerald-400/30 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(0,128,128,0.1)_0%,rgba(0,0,0,0)_60%)]"></div>
            </div>

            <div className="px-4 sm:px-6 lg:px-8 pb-8">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Avatar Section */}
                <div className="flex flex-col items-center -mt-16 sm:-mt-20">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.1 }}
                    className="relative group"
                  >
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white shadow-lg">
                      <AnimatePresence mode="wait">
                        {isEditing ? (
                          <motion.div
                            key="edit-avatar"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative w-full h-full"
                          >
                            <input
                              type="file"
                              name="avatar"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              aria-label="Upload new avatar"
                            />
                            <img
                              src={
                                user?.avatar ||
                                "https://i.pinimg.com/736x/f1/0f/f7/f10ff70a7155e5ab666bcdd1b45b726d.jpg"
                              }
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="flex flex-col items-center gap-2 text-white">
                                <Camera className="w-6 h-6" />
                                <span className="text-xs font-medium">Change Photo</span>
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.img
                            key="view-avatar"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            src={
                              user?.avatar || "https://i.pinimg.com/736x/f1/0f/f7/f10ff70a7155e5ab666bcdd1b45b726d.jpg"
                            }
                            alt="Profile"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>

                  {/* Username */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.2 }}
                    className="mt-4 text-center"
                  >
                    <h2 className="text-2xl font-bold text-slate-800">@{user?.username}</h2>
                    <p className="text-slate-500 text-sm mt-1">Member since {new Date().getFullYear()}</p>
                  </motion.div>
                </div>

                {/* Profile Details */}
                <div className="flex-1 space-y-8 pt-6 lg:pt-0">
                  {/* Personal Information */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.3 }}
                  >
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                      <UserIcon className="w-5 h-5 mr-2 text-teal-500" />
                      Personal Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">First Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="first_name"
                            value={user?.first_name || ""}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                            placeholder="Enter your first name"
                          />
                        ) : (
                          <p className="text-lg text-slate-800 font-medium">{user?.first_name || "Not specified"}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">Last Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="last_name"
                            value={user?.last_name || ""}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                            placeholder="Enter your last name"
                          />
                        ) : (
                          <p className="text-lg text-slate-800 font-medium">{user?.last_name || "Not specified"}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Date of Birth */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.4 }}
                  >
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-teal-500" />
                      Date of Birth
                    </h3>

                    {isEditing ? (
                      <input
                        type="date"
                        name="date_of_birth"
                        value={user?.date_of_birth || ""}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                      />
                    ) : (
                      <p className="text-lg text-slate-800 font-medium">
                        {user?.date_of_birth
                          ? new Date(user.date_of_birth).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "Not specified"}
                      </p>
                    )}
                  </motion.div>

                  {/* About Me */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.5 }}
                    className="space-y-2"
                  >
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                      <Mail className="w-5 h-5 mr-2 text-teal-500" />
                      About Me
                    </h3>

                    {isEditing ? (
                      <textarea
                        name="description"
                        value={user?.description || ""}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm min-h-[150px] resize-y"
                        placeholder="Tell us about yourself..."
                      />
                    ) : (
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                        <p className="text-slate-700 leading-relaxed">
                          {user?.description ||
                            "No description available. Edit your profile to add information about yourself."}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ProfilePage

