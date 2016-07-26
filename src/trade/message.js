var ECodes = {
  'ec1000': 'Cannot create offer from invalid offer data.',
  'ec1001': 'Jackpot is currently set to pause. we are sorry for the inconvience caused.',
  'ec1002': 'Error loading user\'s inventory. Please make sure your inventory is set to public and try again later.',
  'ec1003': 'Some of the items submitted cannot be tracked from inventory. If it is a temporary error from steam then please try again later.',
  'ec1004': 'Unable to send you trade offer. Please make sure your trade url is set correctly.',
  'ec1005': 'Steam seems to be misbehaving. Your accepted offer was received in glitched state. We will try again later with your offer.',
  'ec1006': 'Your trade offer was canceled. We do not support countered offers at this moment. we are sorry for the inconvience caused.',
  'ec1007': 'Steam seems to be misbehaving. We cannot receive items of your accepted offer. Please contact admin with your offer token and offer Id included in the offer message sent by the bot.'
};

var SCodes = {
  'sc1000': 'We have sent you an offer. Please accept the offer in order to participate in the game.'
};

exports.Error = function (n, d) {
  if (!ECodes[n]) {
    throw new Error('No error registered for error number -> ', n);
    return;
  }
  
  return {
    type: 'error',
    code: n,
    message: ECodes[n],
    data: d
  }
};

exports.Success = function (n, d) {
  if (!SCodes[n]) {
    throw new Error('No success code registered for code -> ', n);
    return;
  }
  
  return {
    type: 'success',
    code: n,
    message: SCodes[n],
    data: d
  };
};