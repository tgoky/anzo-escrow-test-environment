import { Request, Response } from 'express';

export const binanceP2PCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return errorResponse(res, 'Missing code or state parameters');
  }

  try {
    // Decode and parse the state parameter
    let signResult;
    try {
      signResult = JSON.parse(decodeURIComponent(state as string));
    } catch (error) {
      return errorResponse(res, 'Invalid state parameter');
    }

    // Fetch P2P user profile data
    const profileData = await fetchP2PUserProfile(code as string);

    // Construct attestation for P2P user profile
    const attestation = {
      verificationContent: 'Binance P2P Profile Verification',
      verificationValue: {
        userGrade: profileData.userGrade || null,
        orderCount: profileData.orderCount || 0,
        advConfirmTime: profileData.advConfirmTime || 0,
        kycVerified: profileData.kycVerified || false,
        kycType: profileData.kycType || null,
        kycStatus: profileData.kycStatus || null,
        avgReleaseTimeOfLatest30day: profileData.avgReleaseTimeOfLatest30day || 0,
        finishRateLatest30day: profileData.finishRateLatest30day || 0,
        completedOrderNumOfLatest30day: profileData.completedOrderNumOfLatest30day || 0,
        completedBuyOrderNumOfLatest30day: profileData.completedBuyOrderNumOfLatest30day || 0,
        completedSellOrderNumOfLatest30day: profileData.completedSellOrderNumOfLatest30day || 0,
        kycType1: profileData.kycType1 || null,
        overComplained: profileData.overComplained || 0,
        onlineStatus: profileData.onlineStatus || null,
        userGradeInstanceRet: profileData.userGradeInstanceRet || null,
        badges: profileData.badges || null,
        vipLevel: profileData.vipLevel || null,
        tradeOrderCount: profileData.tradeOrderCount || 0,
        lastActiveTime: profileData.lastActiveTime || null,
        success: profileData.success || false,
      },
      dataSourceId: 'binance_p2p',
      attestationType: 'P2P Profile Verification',
      requestid: signResult.requestid || signResult.appId || 'unknown',
      signature: signResult.signature || undefined,
      algorithmType: signResult.algorithmType || 'proxytls',
      requests: [
        {
          url: 'https://p2p.binance.com/bapi/c2c/v1/private/c2c/user/profile',
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          queryString: `code=${code}`,
          body: {},
          urlType: 'EXACT',
          response: {
            status: 200,
            headers: {},
            body: {
              data: {
                userGrade: profileData.userGrade,
                orderCount: profileData.orderCount,
                advConfirmTime: profileData.advConfirmTime,
                kycVerified: profileData.kycVerified,
                kycType: profileData.kycType,
                kycStatus: profileData.kycStatus,
                userStatsRet: {
                  avgReleaseTimeOfLatest30day: profileData.avgReleaseTimeOfLatest30day,
                  finishRateLatest30day: profileData.finishRateLatest30day,
                  completedOrderNumOfLatest30day: profileData.completedOrderNumOfLatest30day,
                  completedBuyOrderNumOfLatest30day: profileData.completedBuyOrderNumOfLatest30day,
                  completedSellOrderNumOfLatest30day: profileData.completedSellOrderNumOfLatest30day,
                },
                userKycRet: {
                  kycType: profileData.kycType1,
                },
                overComplained: profileData.overComplained,
                onlineStatus: profileData.onlineStatus,
                userGradeInstanceRet: profileData.userGradeInstanceRet,
                badges: profileData.badges,
                vipLevel: profileData.vipLevel,
                tradeOrderCount: profileData.tradeOrderCount,
                lastActiveTime: profileData.lastActiveTime,
              },
              success: profileData.success,
            },
          },
        },
      ],
    };

    const primusResponse = {
      result: true,
      params: { attestation },
    };

    return successResponse(res, primusResponse);
  } catch (error) {
    console.error('Binance P2P Profile verification error:', error);
    return errorResponse(res, 'Failed to verify Binance P2P Profile');
  }
};

async function fetchP2PUserProfile(code: string) {
  try {
    const response = await fetch('https://p2p.binance.com/bapi/c2c/v1/private/c2c/user/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${code}`, // Adjust based on actual authentication method
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch P2P user profile');
    }

    const data = await response.json();
    return {
      userGrade: data.data?.userGrade || null,
      orderCount: data.data?.orderCount || 0,
      advConfirmTime: data.data?.advConfirmTime || 0,
      kycVerified: data.data?.kycVerified || false,
      kycType: data.data?.kycType || null,
      kycStatus: data.data?.kycStatus || null,
      avgReleaseTimeOfLatest30day: data.data?.userStatsRet?.avgReleaseTimeOfLatest30day || 0,
      finishRateLatest30day: data.data?.userStatsRet?.finishRateLatest30day || 0,
      completedOrderNumOfLatest30day: data.data?.userStatsRet?.completedOrderNumOfLatest30day || 0,
      completedBuyOrderNumOfLatest30day: data.data?.userStatsRet?.completedBuyOrderNumOfLatest30day || 0,
      completedSellOrderNumOfLatest30day: data.data?.userStatsRet?.completedSellOrderNumOfLatest30day || 0,
      kycType1: data.data?.userKycRet?.kycType || null,
      overComplained: data.data?.overComplained || 0,
      onlineStatus: data.data?.onlineStatus || null,
      userGradeInstanceRet: data.data?.userGradeInstanceRet || null,
      badges: data.data?.badges || null,
      vipLevel: data.data?.vipLevel || null,
      tradeOrderCount: data.data?.tradeOrderCount || 0,
      lastActiveTime: data.data?.lastActiveTime || null,
      success: data.success || false,
    };
  } catch (error) {
    console.error('Error fetching P2P user profile:', error);
    throw error;
  }
}

function successResponse(res: Response, primusResponse: any) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const html = `
    <html>
      <body>
        <script>
          window.opener.postMessage({
            type: 'BINANCE_P2P_PROFILE_RESULT',
            success: true,
            ${JSON.stringify(primusResponse).slice(1, -1)}
          }, '${frontendUrl}');
          window.close();
        </script>
      </body>
    </html>
  `;
  res.set('Content-Type', 'text/html');
  return res.status(200).send(html);
}

function errorResponse(res: Response, message: string) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const html = `
    <html>
      <body>
        <script>
          window.opener.postMessage({
            type: 'BINANCE_P2P_PROFILE_RESULT',
            success: false,
            error: '${message}'
          }, '${frontendUrl}');
          window.close();
        </script>
      </body>
    </html>
  `;
  res.set('Content-Type', 'text/html');
  return res.status(400).send(html);
}
