export const processData = (rawData) => {
  const dates = rawData.map(item => item.date)
  const prices = rawData.map(item => item.price)
  
  return {
    dates,
    prices
  }
} 