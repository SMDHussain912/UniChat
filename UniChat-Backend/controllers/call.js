const Call = require('../models/Call');
const User = require('../models/User');

async function initiateCall(req, res) {
  try {
    const callerId = req.user?.id;
    const { receiverId, callType } = req.body;

    if (!receiverId || !callType) {
      return res.status(400).json({ success: false, message: 'Receiver ID and call type required' });
    }

    const caller = await User.findById(callerId).select('name');
    if (!caller) {
      return res.status(404).json({ success: false, message: 'Caller not found' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Receiver not found' });
    }

    const existingCall = await Call.findOne({
      $or: [
        { caller: callerId, receiver: receiverId, status: { $in: ['initiated', 'ringing', 'connected'] } },
        { caller: receiverId, receiver: callerId, status: { $in: ['initiated', 'ringing', 'connected'] } }
      ]
    });

    if (existingCall) {
      return res.status(409).json({ success: false, message: 'Call already in progress' });
    }

    const call = await Call.create({
      caller: callerId,
      receiver: receiverId,
      type: callType,
      status: 'ringing',
      participants: [
        { user: callerId },
        { user: receiverId }
      ]
    });

    res.status(201).json({ success: true, call });
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function acceptCall(req, res) {
  try {
    const userId = req.user?.id;
    const { callId } = req.params;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    if (call.receiver.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (call.status !== 'ringing') {
      return res.status(400).json({ success: false, message: 'Call not in ringing state' });
    }

    call.status = 'connected';
    call.startTime = new Date();
    const receiverParticipant = call.participants.find(p => p.user.toString() === userId);
    if (receiverParticipant) {
      receiverParticipant.joinedAt = new Date();
    }

    await call.save();
    res.status(200).json({ success: true, call });
  } catch (error) {
    console.error('Error accepting call:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function rejectCall(req, res) {
  try {
    const userId = req.user?.id;
    const { callId } = req.params;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    if (call.receiver.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    call.status = 'rejected';
    call.endTime = new Date();
    await call.save();

    res.status(200).json({ success: true, call });
  } catch (error) {
    console.error('Error rejecting call:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function endCall(req, res) {
  try {
    const userId = req.user?.id;
    const { callId } = req.params;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    const isParticipant = call.participants.some(p => p.user.toString() === userId) ||
      call.caller.toString() === userId || call.receiver.toString() === userId;

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Not a participant' });
    }

    call.status = 'ended';
    call.endTime = new Date();
    const participant = call.participants.find(p => p.user.toString() === userId);
    if (participant && !participant.leftAt) {
      participant.leftAt = new Date();
    }

    await call.save();
    res.status(200).json({ success: true, call });
  } catch (error) {
    console.error('Error ending call:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getCallHistory(req, res) {
  try {
    const userId = req.user?.id;
    const { limit = 50 } = req.query;

    const calls = await Call.find({
      $or: [
        { caller: userId },
        { receiver: userId }
      ]
    })
      .populate('caller', 'name displayName avatar')
      .populate('receiver', 'name displayName avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    const result = calls.map(call => ({
      id: call._id,
      caller: call.caller,
      receiver: call.receiver,
      type: call.type,
      status: call.status,
      startTime: call.startTime,
      endTime: call.endTime,
      duration: call.duration,
      isOutgoing: call.caller._id.toString() === userId,
      createdAt: call.createdAt
    }));

    res.status(200).json({ success: true, calls: result });
  } catch (error) {
    console.error('Error getting call history:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  getCallHistory
};
