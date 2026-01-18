#include <stdint.h>
#include <vector>
#include <optional>
#include <cstddef>


struct Pair {
    int x;
    int y;
};

class Queue {
  public:
      Queue() : head(0), TRUNCATION_SIZE(2'000'000) {}

      void enqueue(int x, int y) {
          queue.push_back({x, y});

          if (head > TRUNCATION_SIZE) {
              queue.erase(queue.begin(), queue.begin() + head);
              head = 0;
          }
      }

      Pair dequeue() {
          return queue[head++];
      }

      bool isEmpty() const {
          return head >= queue.size();
      }

  private:
    std::vector<Pair> queue;
    std::size_t head;
    const std::size_t TRUNCATION_SIZE;
};

int validPixel(int x, int y, int width, int height, uint8_t *visited, uint8_t *startColor, uint8_t *fillColor, uint8_t *canvasData, int noProcessing){
    int outsideCanvas = x < 0 || x >= width || y < 0 || y >= height;
    if (outsideCanvas || visited[x + y * width]){
      return 0;
    }

    int val = 4*(x + y * width);

    int rDist = canvasData[val] - startColor[0];
    int gDist = canvasData[val + 1] - startColor[1];
    int bDist = canvasData[val + 2] - startColor[2];
    int aDist = canvasData[val + 3] - startColor[3];
    int RGBdistance = 
      rDist * rDist +
      gDist * gDist +
      bDist * bDist +
      aDist * aDist;

    //70 is the "tolerance", or the threshold for what's considered a matching color.
    int matchesColor = RGBdistance < 70*70;
    if (matchesColor && !noProcessing){
      visited[x + y * width] = 1;
      canvasData[val] = fillColor[0];
      canvasData[val + 1] = fillColor[1];
      canvasData[val + 2] = fillColor[2];
      canvasData[val + 3] = fillColor[3];
    }
    return matchesColor;
}


extern "C" void lineFill(int X, int Y, int width, int height, uint8_t *startColor, uint8_t *fillColor, uint8_t *canvasData){
    std::vector<uint8_t> visited(width * height, 0);
    uint8_t* visitedPtr = visited.data();

    Queue pixelQueue;
    Pair pixel;
    pixelQueue.enqueue(X, Y);

    while (!pixelQueue.isEmpty()){
      pixel = pixelQueue.dequeue();
      int x = pixel.x;
      int y = pixel.y;

      if (!validPixel(x, y, width, height, visitedPtr, startColor, fillColor, canvasData, 0)){
        continue;
      }

      int left = x - 1;
      while (left >= 0){
        if (!validPixel(left, y, width, height, visitedPtr, startColor, fillColor, canvasData, 0)){
          left += 1;
          break;
        }
        left -= 1;
      }
      int right = x + 1;
      while (right < width){
        if (!validPixel(right, y, width, height, visitedPtr, startColor, fillColor, canvasData, 0)){
          right -= 1;
          break;
        }
        right += 1;
      }

      int trackTop = -5;
      int trackBottom = -5;
      for (int i = left; i <= right; i++){
        if (validPixel(i, y-1, width, height, visitedPtr, startColor, fillColor, canvasData, 1)){
          if (trackTop != i - 1){
            pixelQueue.enqueue(i, y-1);
          }
          trackTop = i;
        }else{
          trackTop = -5;
        }
        if (validPixel(i, y+1, width, height, visitedPtr, startColor, fillColor, canvasData, 1)){
          if (trackBottom != i - 1){
            pixelQueue.enqueue(i, y+1);
          }
          trackBottom= i;
        }else{
          trackBottom = -5;
        }
      }
    }
    //no return, simply modifies the array.
}
