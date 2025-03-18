import React, { useState } from 'react';
import { Edit2, Save, X, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProfilePage = () => {
  const initialProfile = {
    username: 'john_doe',
    avatar: 'https://static-00.iconduck.com/assets.00/avatar-default-icon-1975x2048-2mpk4u9k.png',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    description: 'A passionate developer exploring the world of technology.',
  };

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState(initialProfile);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement & { files: FileList }>) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfile((prev) => ({ ...prev, avatar: imageUrl }));
    }
  };

  const toggleEdit = () => {
    if (isEditing) {
      // Optionally save changes here if integrated with a backend
    }
    setIsEditing(!isEditing);
  };

  const handleDiscard = () => {
    setProfile(initialProfile); // Reset to initial values
    setIsEditing(false); // Exit edit mode
  };

  const springTransition = {
    type: 'spring',
    damping: 10,
    stiffness: 100,
  };

  return (
    <div className="h-full w-full bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col"
      >
        {/* Header */}
        <header className="bg-gradient-to-r from-indigo-600 to-purple-600 py-6 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center px-4 sm:px-6 lg:px-8">
            <motion.h1
              initial={{ x: -20 }}
              animate={{ x: 0 }}
              transition={springTransition}
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white flex items-center"
            >
              <UserIcon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 mr-3" />
              Profile
            </motion.h1>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleEdit}
                className={`flex items-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-white font-medium text-sm sm:text-base transition-all duration-200 ${
                  isEditing
                    ? 'bg-indigo-700 hover:bg-indigo-800'
                    : 'bg-white/10 hover:bg-white/20 border border-white/20'
                }`}
                aria-label={isEditing ? 'Save changes' : 'Edit profile'}
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
                  className="flex items-center px-3 py-2 sm:px-4 sm:py-2.5 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium text-sm sm:text-base transition-all duration-200"
                  aria-label="Discard changes"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Discard
                </motion.button>
              )}
            </div>
          </div>
        </header>

        {/* Profile Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-12 overflow-auto">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-12">
            {/* Avatar Section */}
            <motion.section
              className="flex flex-col items-center lg:items-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.1 }}
            >
              <div className="relative group w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48">
                <AnimatePresence>
                  {isEditing ? (
                    <motion.div
                      key="edit-avatar"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center"
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
                        src={profile.avatar}
                        alt="Preview"
                        className="w-full h-full rounded-full object-cover border-2 border-gray-300 shadow-sm"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-white text-xs sm:text-sm font-medium px-2 py-1 bg-gray-900/50 rounded">
                          Change Image
                        </span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.img
                      key="view-avatar"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      src={profile.avatar}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </AnimatePresence>
              </div>
            </motion.section>

            {/* Profile Details */}
            <section className="flex-1 space-y-6 sm:space-y-8 lg:space-y-10">
              {/* Username */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springTransition, delay: 0.2 }}
              >
                <label className="text-sm font-medium text-gray-700">Username</label>
                <AnimatePresence mode="wait">
                  {isEditing ? (
                    <motion.input
                      key="username-input"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      type="text"
                      name="username"
                      value={profile.username}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white/80 shadow-sm text-base sm:text-lg"
                    />
                  ) : (
                    <motion.p
                      key="username-text"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900"
                    >
                      @{profile.username}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Name */}
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springTransition, delay: 0.3 }}
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">First Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="firstName"
                      value={profile.firstName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white/80 shadow-sm"
                    />
                  ) : (
                    <p className="text-base sm:text-lg lg:text-xl text-gray-900 font-medium">
                      {profile.firstName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Last Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="lastName"
                      value={profile.lastName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white/80 shadow-sm"
                    />
                  ) : (
                    <p className="text-base sm:text-lg lg:text-xl text-gray-900 font-medium">
                      {profile.lastName}
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Date of Birth */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springTransition, delay: 0.4 }}
              >
                <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                {isEditing ? (
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={profile.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white/80 shadow-sm"
                  />
                ) : (
                  <p className="text-base sm:text-lg lg:text-xl text-gray-900 font-medium">
                    {new Date(profile.dateOfBirth).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </motion.div>

              {/* Description */}
              <motion.div
                className="space-y-2 flex-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springTransition, delay: 0.5 }}
              >
                <label className="text-sm font-medium text-gray-700">About Me</label>
                {isEditing ? (
                  <textarea
                    name="description"
                    value={profile.description}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white/80 shadow-sm min-h-[100px] sm:min-h-[120px] lg:min-h-[150px] resize-y"
                  />
                ) : (
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                    {profile.description}
                  </p>
                )}
              </motion.div>
            </section>
          </div>
        </main>
      </motion.div>
    </div>
  );
};

export default ProfilePage;