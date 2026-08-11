const Sticker = require('../models/Sticker');
const User = require('../models/User');

exports.getStickers = async (req, res) => {
  try {
    const { serverId } = req.query;
    const userId = req.user?.id;

    const query = { isCustom: false };
    if (serverId) {
      query.$or = [{ server: serverId }, { server: null }];
    }

    const stickers = await Sticker.find(query).sort({ createdAt: -1 }).limit(100);

    res.status(200).json({
      success: true,
      stickers: stickers.map(s => ({
        id: s._id,
        name: s.name,
        description: s.description,
        imageUrl: s.imageUrl,
        thumbnailUrl: s.thumbnailUrl,
        type: s.type,
        tags: s.tags,
        isAnimated: s.isAnimated
      }))
    });
  } catch (error) {
    console.error('Error getting stickers:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCustomStickers = async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.user?.id;

    const stickers = await Sticker.find({ server: serverId, isCustom: true })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      stickers: stickers.map(s => ({
        id: s._id,
        name: s.name,
        description: s.description,
        imageUrl: s.imageUrl,
        thumbnailUrl: s.thumbnailUrl,
        type: s.type,
        tags: s.tags,
        isAnimated: s.isAnimated,
        creator: s.creator
      }))
    });
  } catch (error) {
    console.error('Error getting custom stickers:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createSticker = async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name, description, imageUrl, thumbnailUrl, type, tags, isAnimated } = req.body;
    const userId = req.user?.id;

    const sticker = await Sticker.create({
      name: name.trim(),
      description: description?.trim() || '',
      server: serverId || null,
      creator: userId,
      imageUrl,
      thumbnailUrl: thumbnailUrl || null,
      type: type || 'static',
      tags: tags || [],
      isCustom: true,
      isAnimated: isAnimated || false
    });

    res.status(201).json({ success: true, sticker });
  } catch (error) {
    console.error('Error creating sticker:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteSticker = async (req, res) => {
  try {
    const { stickerId } = req.params;
    const userId = req.user?.id;

    const sticker = await Sticker.findById(stickerId);
    if (!sticker) {
      return res.status(404).json({ success: false, message: 'Sticker not found' });
    }

    if (sticker.creator.toString() !== userId && !req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await sticker.deleteOne();

    res.status(200).json({ success: true, message: 'Sticker deleted' });
  } catch (error) {
    console.error('Error deleting sticker:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};