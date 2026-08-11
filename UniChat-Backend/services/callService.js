const Call = require('../models/Call');
const onlineUsers = require('./onlineUsers');
const User = require('../models/User');

async function initiateCall(callerId, receiverId, callType, io) {
  const caller = await User.findById(callerId).select('name');
  const receiver = await User.findById(receiverId).select('name');

  if (!receiver) {
    return { success: false, error: 'Receiver not found' };
  }

  const existingActiveCall = await Call.findOne({
    $or: [
      { caller: callerId, receiver: receiverId, status: { $in: ['initiated', 'ringing', 'connected'] } },
      { caller: receiverId, receiver: callerId, status: { $in: ['initiated', 'ringing', 'connected'] } }
    ]
  });

  if (existingActiveCall) {
    return { success: false, error: 'Call already in progress', callId: existingActiveCall._id };
  }

  const call = await Call.create({
    caller: callerId,
    receiver: receiverId,
    type: callType,
    status: 'ringing',
    participants: [
      { user: callerId, socketId: null },
      { user: receiverId, socketId: null }
    ]
  });

  const receiverSockets = onlineUsers.getSocketIds(receiverId);
  if (receiverSockets.length > 0) {
    for (const sid of receiverSockets) {
      io.to(sid).emit('incoming-call', {
        callId: call._id,
        callerId: callerId,
        callerName: caller ? caller.name : 'Unknown',
        callType: callType,
        timestamp: call.createdAt
      });
    }
  } else {
    await Call.findByIdAndUpdate(call._id, { status: 'missed' });
  }

  return { success: true, call };
}

async function acceptCall(callId, receiverId, io) {
  const call = await Call.findById(callId);
  if (!call) {
    return { success: false, error: 'Call not found' };
  }

  if (call.receiver.toString() !== receiverId) {
    return { success: false, error: 'Not authorized' };
  }

  if (call.status !== 'ringing') {
    return { success: false, error: 'Call is not in ringing state' };
  }

  call.status = 'connected';
  call.startTime = new Date();

  const receiverParticipant = call.participants.find(p => p.user.toString() === receiverId);
  if (receiverParticipant) {
    receiverParticipant.joinedAt = new Date();
  }

  await call.save();

  const callerSockets = onlineUsers.getSocketIds(call.caller);
  for (const sid of callerSockets) {
    io.to(sid).emit('call-accepted', {
      callId: call._id,
      receiverId: receiverId
    });
  }

  return { success: true, call };
}

async function rejectCall(callId, receiverId, io) {
  const call = await Call.findById(callId);
  if (!call) {
    return { success: false, error: 'Call not found' };
  }

  if (call.receiver.toString() !== receiverId) {
    return { success: false, error: 'Not authorized' };
  }

  call.status = 'rejected';
  call.endTime = new Date();
  await call.save();

  const callerSockets = onlineUsers.getSocketIds(call.caller);
  for (const sid of callerSockets) {
    io.to(sid).emit('call-rejected', {
      callId: call._id
    });
  }

  return { success: true, call };
}

async function endCall(callId, userId, io) {
  const call = await Call.findById(callId);
  if (!call) {
    return { success: false, error: 'Call not found' };
  }

  const isParticipant = call.participants.some(p => p.user.toString() === userId);
  if (!isParticipant && call.caller.toString() !== userId && call.receiver.toString() !== userId) {
    return { success: false, error: 'Not a participant' };
  }

  call.status = 'ended';
  call.endTime = new Date();

  const participant = call.participants.find(p => p.user.toString() === userId);
  if (participant && !participant.leftAt) {
    participant.leftAt = new Date();
  }

  await call.save();

  const otherUserId = call.caller.toString() === userId ? call.receiver : call.caller;
  const otherSockets = onlineUsers.getSocketIds(otherUserId);
  for (const sid of otherSockets) {
    io.to(sid).emit('call-ended', {
      callId: call._id,
      endedBy: userId,
      duration: call.duration
    });
  }

  return { success: true, call };
}

async function sendIceCandidate(callId, senderId, candidate, io) {
  const call = await Call.findById(callId);
  if (!call) {
    return { success: false, error: 'Call not found' };
  }

  const senderParticipant = call.participants.find(p => p.user.toString() === senderId);
  const receiverId = call.caller.toString() === senderId ? call.receiver : call.caller;

  if (senderParticipant) {
    senderParticipant.lastIceCandidate = new Date();
  }

  const receiverSockets = onlineUsers.getSocketIds(receiverId);
  for (const sid of receiverSockets) {
    io.to(sid).emit('ice-candidate', {
      callId: callId,
      senderId: senderId,
      candidate: candidate
    });
  }

  return { success: true };
}

async function sendOffer(callId, senderId, offer, io) {
  const call = await Call.findById(callId);
  if (!call) {
    return { success: false, error: 'Call not found' };
  }

  const receiverId = call.caller.toString() === senderId ? call.receiver : call.caller;
  const receiverSockets = onlineUsers.getSocketIds(receiverId);

  for (const sid of receiverSockets) {
    io.to(sid).emit('offer', {
      callId: callId,
      senderId: senderId,
      offer: offer
    });
  }

  return { success: true };
}

async function sendAnswer(callId, senderId, answer, io) {
  const call = await Call.findById(callId);
  if (!call) {
    return { success: false, error: 'Call not found' };
  }

  const callerId = call.caller.toString();
  const callerSockets = onlineUsers.getSocketIds(callerId);

  for (const sid of callerSockets) {
    io.to(sid).emit('answer', {
      callId: callId,
      senderId: senderId,
      answer: answer
    });
  }

  return { success: true };
}

async function getCallHistory(userId, limit = 50) {
  const calls = await Call.find({
    $or: [
      { caller: userId },
      { receiver: userId }
    ]
  })
    .populate('caller', 'name displayName avatar')
    .populate('receiver', 'name displayName avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return calls.map(call => ({
    id: call._id,
    caller: call.caller,
    receiver: call.receiver,
    type: call.type,
    status: call.status,
    startTime: call.startTime,
    endTime: call.endTime,
    duration: call.duration,
    isOutgoing: call.caller.toString() === userId,
    createdAt: call.createdAt
  }));
}

module.exports = {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  sendIceCandidate,
  sendOffer,
  sendAnswer,
  getCallHistory
};
